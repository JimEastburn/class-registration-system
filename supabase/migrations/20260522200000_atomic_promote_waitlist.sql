-- Atomic, capacity-aware waitlist promotion.
--
-- Background: promoteFromWaitlist() previously ran the capacity check, the
-- waitlist lookup, and the UPDATE as separate statements — a classic TOCTOU
-- race window. Two concurrent promotions, or a promotion racing an
-- enrollment, could over-fill a class.
--
-- This function locks the class row (FOR UPDATE) so it serializes against
-- enroll_student() (which locks the same row) and any concurrent
-- promote_waitlist_one() call for the same class. Count + UPDATE + reorder
-- are atomic within that lock. Returns the promoted enrollment row, or NULL
-- when there is no room or no one waitlisted.

CREATE OR REPLACE FUNCTION public.promote_waitlist_one(p_class_id uuid)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity     integer;
  v_seats_taken  integer;
  v_target_id    uuid;
  v_old_position integer;
  v_row          public.enrollments;
BEGIN
  -- Lock the class row; serializes with enroll_student() and concurrent
  -- promote_waitlist_one() calls for the same class.
  SELECT capacity INTO v_capacity
    FROM public.classes
   WHERE id = p_class_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  -- True class-wide seat count (confirmed + pending both hold a seat).
  SELECT count(*) INTO v_seats_taken
    FROM public.enrollments
   WHERE class_id = p_class_id
     AND status IN ('confirmed', 'pending');

  -- No room → nothing to promote.
  IF v_seats_taken >= v_capacity THEN
    RETURN NULL;
  END IF;

  -- Pick the next promotion target: lowest waitlist_position, tiebreak by
  -- created_at to keep behaviour deterministic if positions ever desync.
  SELECT id, waitlist_position
    INTO v_target_id, v_old_position
    FROM public.enrollments
   WHERE class_id = p_class_id
     AND status = 'waitlisted'
   ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
   LIMIT 1;

  -- Empty waitlist → nothing to promote.
  IF v_target_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Promote: status → pending, waitlist_position → NULL.
  UPDATE public.enrollments
     SET status = 'pending',
         waitlist_position = NULL
   WHERE id = v_target_id
  RETURNING * INTO v_row;

  -- Shift remaining waitlisted rows down by one position so the list stays
  -- contiguous (1..N). Bump updated_at so audit trails reflect the shift.
  IF v_old_position IS NOT NULL THEN
    UPDATE public.enrollments
       SET waitlist_position = waitlist_position - 1,
           updated_at = now()
     WHERE class_id = p_class_id
       AND status = 'waitlisted'
       AND waitlist_position > v_old_position;
  END IF;

  RETURN v_row;
END;
$function$;

-- Match enroll_student's grant pattern: callable by parents (authenticated)
-- and admin code (service_role); not directly callable by anon.
REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO service_role;
