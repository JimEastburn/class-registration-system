-- Fix waitlist position collisions in enroll_student().
--
-- Background: enroll_student() picked the next waitlist position by COUNTING
-- waitlisted rows (count(*) + 1). That is only correct while positions are gapless.
-- cancelEnrollment() hard-DELETEs a waitlisted row without renumbering the rest, so
-- a gap is easy to create:
--
--   positions 1,2,3 -> #2 cancels -> positions 1,3
--   next registrant: count(*) + 1 = 3  -> collides with the existing position 3
--
-- The collision is rejected by uq_enrollments_class_waitlist_position (added in
-- 20260523200100), so the INSERT raises "duplicate key value violates unique
-- constraint" and the family simply cannot join the waitlist. The ON CONFLICT
-- clause does not catch it -- that targets (student_id, class_id), a different
-- constraint.
--
-- Fix: take the highest position and add one, which is gap-tolerant and is already
-- what add_to_waitlist() does (20260523200000). Gaps then stay harmless: ordering
-- and promotion both key off waitlist_position, and promote_waitlist_one() shifts
-- the remaining positions down when a seat opens.
--
-- Only the position calculation changes; the rest of the function is unchanged from
-- 20260521200000_atomic_enroll_student.sql.

CREATE OR REPLACE FUNCTION public.enroll_student(
  p_student_id uuid,
  p_class_id uuid
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity    integer;
  v_seats_taken integer;
  v_status      "EnrollmentStatus";
  v_position    integer;
  v_row         public.enrollments;
BEGIN
  -- Defense in depth: this function is SECURITY DEFINER and bypasses the enrollments
  -- INSERT RLS policy, so re-enforce family ownership for end-user (authenticated)
  -- callers. service_role callers (adminEnrollStudent) have a null auth.uid() and are
  -- trusted -- they perform their own role authorization in the server action.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE id = p_student_id AND parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to enroll this student';
  END IF;

  -- Lock the class row so concurrent enrollments for this class serialize.
  SELECT capacity INTO v_capacity
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  -- True class-wide seat count: confirmed + pending both hold a seat.
  SELECT count(*) INTO v_seats_taken
  FROM public.enrollments
  WHERE class_id = p_class_id
    AND status IN ('confirmed', 'pending');

  IF v_seats_taken >= v_capacity THEN
    v_status := 'waitlisted';
    -- Highest position + 1, not count(*) + 1: positions may have gaps after a
    -- cancellation, and coalesce handles the empty-waitlist case. Matches
    -- add_to_waitlist().
    SELECT coalesce(max(waitlist_position), 0) + 1 INTO v_position
    FROM public.enrollments
    WHERE class_id = p_class_id
      AND status = 'waitlisted';
  ELSE
    v_status := 'pending';
    v_position := NULL;
  END IF;

  -- Insert a new enrollment, or atomically reactivate a previously cancelled
  -- one for the same (student, class). The WHERE guard rejects an active
  -- duplicate (callers also pre-check) so it surfaces as a clear error rather
  -- than silently overwriting a confirmed/pending/waitlisted row.
  INSERT INTO public.enrollments (student_id, class_id, status, waitlist_position)
  VALUES (p_student_id, p_class_id, v_status, v_position)
  ON CONFLICT (student_id, class_id) DO UPDATE
    SET status = EXCLUDED.status,
        waitlist_position = EXCLUDED.waitlist_position
    WHERE enrollments.status = 'cancelled'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student is already enrolled in this class';
  END IF;

  RETURN v_row;
END;
$function$;

-- Grants are unchanged by CREATE OR REPLACE, but restate them so this migration is
-- self-contained if replayed against a fresh database.
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO service_role;
