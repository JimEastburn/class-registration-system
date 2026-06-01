-- Waitlist position indexes.
--
-- 1. Composite partial index speeds up the ORDER BY in promote_waitlist_one
--    and the max(waitlist_position) lookup in add_to_waitlist. Partial on
--    status = 'waitlisted' keeps the index small (waitlisted rows are a
--    minority of all enrollments).
--
-- 2. Partial unique index makes position duplicates impossible at the DB
--    level. The atomic RPCs already maintain this invariant, but defensive
--    depth catches any future code path that bypasses them.
--
-- Pre-check: fail loudly if existing data already violates uniqueness, so a
-- bad deploy surfaces immediately instead of silently rolling back.
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT count(*) INTO v_dup_count
    FROM (
      SELECT class_id, waitlist_position
        FROM public.enrollments
       WHERE status = 'waitlisted'
         AND waitlist_position IS NOT NULL
       GROUP BY class_id, waitlist_position
      HAVING count(*) > 1
    ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION
      'Cannot add unique index: % (class_id, waitlist_position) duplicates exist among waitlisted rows. Fix the data before re-running this migration.',
      v_dup_count;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_enrollments_class_status_position
  ON public.enrollments (class_id, status, waitlist_position)
  WHERE status = 'waitlisted';

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_class_waitlist_position
  ON public.enrollments (class_id, waitlist_position)
  WHERE status = 'waitlisted' AND waitlist_position IS NOT NULL;
