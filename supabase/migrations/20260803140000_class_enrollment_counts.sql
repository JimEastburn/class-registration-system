-- RLS-safe, class-wide enrollment tallies for capacity display.
--
-- Background: getClassAvailability() and getEnrollmentCountsByClass() counted
-- enrollments through the RLS-scoped server client. The "Parents can view own
-- enrollments" policy limits a parent to their own family's rows, so the count came
-- back ~0 instead of the true class total -- `available` was inflated to nearly full
-- capacity and EnrollButton's `isFull` was always false, so the "Class Full - Join
-- Waitlist" UI never rendered for the families it was written for.
--
-- This is the read-path twin of the bug that 20260521200000_atomic_enroll_student.sql
-- fixed on the write path. This function counts with definer rights (so it sees every
-- row) using the same seat rule as enroll_student: confirmed + pending both hold a
-- seat. It returns aggregate integers only -- no student identity -- so it is safe to
-- expose to any authenticated caller.
--
-- Set-returning over an array of class ids so list views (browse grid, admin table)
-- tally a whole page in one round trip.

CREATE OR REPLACE FUNCTION public.get_class_enrollment_counts(p_class_ids uuid[])
RETURNS TABLE (
  class_id uuid,
  capacity integer,
  confirmed_count integer,
  pending_count integer,
  waitlisted_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id AS class_id,
    c.capacity,
    count(*) FILTER (WHERE e.status = 'confirmed')::integer  AS confirmed_count,
    count(*) FILTER (WHERE e.status = 'pending')::integer    AS pending_count,
    count(*) FILTER (WHERE e.status = 'waitlisted')::integer AS waitlisted_count
  FROM public.classes c
  LEFT JOIN public.enrollments e ON e.class_id = c.id
  WHERE c.id = ANY(p_class_ids)
  GROUP BY c.id, c.capacity;
$function$;

-- Any signed-in user may ask how full a class is; anon may not.
REVOKE EXECUTE ON FUNCTION public.get_class_enrollment_counts(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_class_enrollment_counts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_class_enrollment_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_enrollment_counts(uuid[]) TO service_role;
