-- Atomic, gated waitlist-add.
--
-- Background: addToWaitlist() previously did SELECT max(position) + INSERT as
-- separate statements — two concurrent calls could both compute position N and
-- both insert at N. It also didn't check class publication status or teacher
-- blocks, and would silently create a 'waitlisted' row even when the class had
-- open seats (the caller is supposed to use enroll_student in that case).
--
-- This function does everything under a FOR UPDATE lock on the class row, so
-- it serializes with enroll_student() and promote_waitlist_one() for the same
-- class. Rejection paths raise EXCEPTION with a stable HINT so callers can
-- discriminate error reasons reliably.
--
-- Error HINTs:
--   WL_NOT_AUTHORIZED       — caller is not the student's parent
--   WL_CLASS_NOT_FOUND      — class_id does not exist
--   WL_NOT_PUBLISHED        — class.status != 'published'
--   WL_BLOCKED              — teacher has blocked this student
--   WL_SEATS_OPEN           — class has capacity; use enroll_student instead
--   WL_DUPLICATE_WAITLISTED — student is already on this class's waitlist
--   WL_DUPLICATE_ACTIVE     — student is already pending/confirmed in this class

CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_class_id uuid,
  p_student_id uuid
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity     integer;
  v_class_status "ClassStatus";
  v_teacher_id   uuid;
  v_seats_taken  integer;
  v_existing     "EnrollmentStatus";
  v_existing_id  uuid;
  v_position     integer;
  v_row          public.enrollments;
BEGIN
  -- Defense in depth: this function is SECURITY DEFINER and bypasses
  -- enrollments INSERT RLS, so re-enforce family ownership for end-user
  -- (authenticated) callers. service_role callers (null auth.uid()) are
  -- trusted — they perform their own role authorization in the server action.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE id = p_student_id AND parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to add this student to the waitlist'
      USING HINT = 'WL_NOT_AUTHORIZED';
  END IF;

  -- Lock the class row. Serializes with enroll_student() and
  -- promote_waitlist_one() for the same class.
  SELECT capacity, status, teacher_id
    INTO v_capacity, v_class_status, v_teacher_id
    FROM public.classes
   WHERE id = p_class_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found'
      USING HINT = 'WL_CLASS_NOT_FOUND';
  END IF;

  IF v_class_status <> 'published' THEN
    RAISE EXCEPTION 'Class is not available for enrollment'
      USING HINT = 'WL_NOT_PUBLISHED';
  END IF;

  -- Teacher-level block applies to all of that teacher's classes.
  IF v_teacher_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.class_blocks
    WHERE teacher_id = v_teacher_id AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'This student has been blocked from the teacher''s classes'
      USING HINT = 'WL_BLOCKED';
  END IF;

  -- True class-wide seat count: confirmed + pending both hold a seat.
  SELECT count(*) INTO v_seats_taken
    FROM public.enrollments
   WHERE class_id = p_class_id
     AND status IN ('confirmed', 'pending');

  -- If seats are open, the caller should use enroll_student instead of
  -- creating an artificially-waitlisted row.
  IF v_seats_taken < v_capacity THEN
    RAISE EXCEPTION 'Class has open seats — use enroll_student instead'
      USING HINT = 'WL_SEATS_OPEN';
  END IF;

  -- Reject any active duplicate (pending/confirmed/waitlisted). A cancelled
  -- row will be reactivated below.
  SELECT id, status
    INTO v_existing_id, v_existing
    FROM public.enrollments
   WHERE class_id = p_class_id
     AND student_id = p_student_id
     AND status IN ('confirmed', 'pending', 'waitlisted')
   LIMIT 1;

  IF FOUND THEN
    IF v_existing = 'waitlisted' THEN
      RAISE EXCEPTION 'Student is already on the waitlist'
        USING HINT = 'WL_DUPLICATE_WAITLISTED';
    ELSE
      RAISE EXCEPTION 'Student is already enrolled in this class'
        USING HINT = 'WL_DUPLICATE_ACTIVE';
    END IF;
  END IF;

  -- Compute next position under the row lock. coalesce(max, 0) + 1 handles
  -- the empty-waitlist case without a separate branch.
  SELECT coalesce(max(waitlist_position), 0) + 1
    INTO v_position
    FROM public.enrollments
   WHERE class_id = p_class_id AND status = 'waitlisted';

  -- Insert new row, or atomically reactivate a previously-cancelled row for
  -- the same (student, class). Matches enroll_student's reactivation pattern.
  INSERT INTO public.enrollments (student_id, class_id, status, waitlist_position)
  VALUES (p_student_id, p_class_id, 'waitlisted', v_position)
  ON CONFLICT (student_id, class_id) DO UPDATE
    SET status = 'waitlisted',
        waitlist_position = v_position,
        updated_at = now()
    WHERE enrollments.status = 'cancelled'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    -- Defensive: should be unreachable given the duplicate check above.
    RAISE EXCEPTION 'Student is already enrolled in this class'
      USING HINT = 'WL_DUPLICATE_ACTIVE';
  END IF;

  RETURN v_row;
END;
$function$;

-- Match enroll_student / promote_waitlist_one grant pattern.
REVOKE EXECUTE ON FUNCTION public.add_to_waitlist(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_to_waitlist(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.add_to_waitlist(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_to_waitlist(uuid, uuid) TO service_role;
