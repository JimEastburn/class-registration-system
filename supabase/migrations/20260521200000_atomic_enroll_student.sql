-- Atomic, RLS-safe enrollment with capacity-aware waitlisting.
--
-- Background: enrollStudent() previously ran its capacity-check COUNT query through
-- the RLS-scoped server client. The "Parents can view own enrollments" policy limits
-- a parent to their own family's rows, so the count returned ~0 instead of the true
-- class total -- isFull was always false, the waitlist branch was unreachable, and
-- every parent enrollment was created 'pending' regardless of capacity (this is why
-- zero 'waitlisted' rows ever existed in production).
--
-- This function counts seats with definer rights (so it sees every row) and performs
-- the count + insert under a FOR UPDATE lock on the class row, so concurrent
-- enrollments for the same class serialize and cannot oversubscribe.

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
    SELECT count(*) + 1 INTO v_position
    FROM public.enrollments
    WHERE class_id = p_class_id
      AND status = 'waitlisted';
  ELSE
    v_status := 'pending';
    v_position := NULL;
  END IF;

  INSERT INTO public.enrollments (student_id, class_id, status, waitlist_position)
  VALUES (p_student_id, p_class_id, v_status, v_position)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- Callable by parents (RLS client = authenticated) and by the admin client
-- (service_role). Not callable by anon -- enrollStudent authenticates first.
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO service_role;
