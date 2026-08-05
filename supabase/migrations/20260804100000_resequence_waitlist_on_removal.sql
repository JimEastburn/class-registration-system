-- Keep waitlist positions contiguous when someone leaves the waitlist.
--
-- Background: nothing renumbered the remaining waitlisted rows when an entry was
-- removed, so positions drifted into gaps (1,2,3 -> #2 cancels -> 1,3). The gap is
-- harmless to ordering, but a family sees "#4" while only three people are ahead of
-- them. Six separate code paths can remove a waitlisted row:
--
--   cancelEnrollment / adminHardDeleteEnrollment  (hard DELETE)
--   adminCancelEnrollment / teacherCancelEnrollment (status -> cancelled, position -> null)
--   blockStudent                                  (status -> cancelled, bulk)
--   removeFromWaitlist                            (hard DELETE)
--
-- Patching each call site would leave the invariant one forgotten call away from
-- breaking, so it is enforced in the database instead: a trigger resequences the
-- class whenever a row leaves the waitlist, no matter which path removed it.

-- Renumber a class's waitlist to a contiguous 1..N, preserving current order.
--
-- Two phases, because uq_enrollments_class_waitlist_position is a plain (immediate,
-- non-deferrable) unique index: shifting every row down by one in a single statement
-- can transiently collide, and PostgreSQL does not promise the row update order that
-- would avoid it. Parking the rows at negative positions first guarantees the final
-- 1..N assignment can never collide with a row that has not been renumbered yet.
CREATE OR REPLACE FUNCTION public.resequence_class_waitlist(p_class_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Phase 1: park at negatives. Positions are positive and unique, so the negated
  -- values are unique among themselves and disjoint from any final 1..N value.
  UPDATE public.enrollments
     SET waitlist_position = -waitlist_position
   WHERE class_id = p_class_id
     AND status = 'waitlisted'
     AND waitlist_position > 0;

  -- Phase 2: assign contiguous positions. DESC over the negatives restores the
  -- original ascending order; created_at breaks ties, matching promote_waitlist_one.
  UPDATE public.enrollments e
     SET waitlist_position = ordered.rn
    FROM (
      SELECT id,
             row_number() OVER (
               ORDER BY waitlist_position DESC NULLS LAST, created_at
             ) AS rn
        FROM public.enrollments
       WHERE class_id = p_class_id
         AND status = 'waitlisted'
    ) AS ordered
   WHERE e.id = ordered.id
     AND e.waitlist_position IS DISTINCT FROM ordered.rn;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resequence_waitlist_on_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.resequence_class_waitlist(OLD.class_id);
  RETURN NULL;
END;
$function$;

-- Separate DELETE and UPDATE triggers because a WHEN clause on a DELETE trigger
-- cannot reference NEW.
--
-- No recursion: resequence_class_waitlist only ever rewrites waitlist_position on
-- rows that stay 'waitlisted' with a non-null position, so neither WHEN clause
-- matches its own writes.
DROP TRIGGER IF EXISTS on_waitlist_delete_resequence ON public.enrollments;
CREATE TRIGGER on_waitlist_delete_resequence
  AFTER DELETE ON public.enrollments
  FOR EACH ROW
  WHEN (OLD.status = 'waitlisted')
  EXECUTE FUNCTION public.resequence_waitlist_on_removal();

DROP TRIGGER IF EXISTS on_waitlist_update_resequence ON public.enrollments;
CREATE TRIGGER on_waitlist_update_resequence
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW
  WHEN (
    OLD.status = 'waitlisted'
    AND (NEW.status IS DISTINCT FROM 'waitlisted' OR NEW.waitlist_position IS NULL)
  )
  EXECUTE FUNCTION public.resequence_waitlist_on_removal();

-- promote_waitlist_one() previously renumbered by hand, decrementing every position
-- above the promoted one. That now double-counts against the trigger (and could
-- itself collide, for the ordering reason described above), so drop the manual shift
-- and let the trigger own the invariant. Net behaviour is slightly better: the
-- remaining rows come back as a contiguous 1..N rather than inheriting whatever gaps
-- preceded the promotion.
CREATE OR REPLACE FUNCTION public.promote_waitlist_one(p_class_id uuid)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity    integer;
  v_seats_taken integer;
  v_row         public.enrollments;
BEGIN
  SELECT capacity INTO v_capacity
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_seats_taken
  FROM public.enrollments
  WHERE class_id = p_class_id
    AND status IN ('confirmed', 'pending');

  IF v_seats_taken >= v_capacity THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
  FROM public.enrollments
  WHERE class_id = p_class_id
    AND status = 'waitlisted'
  ORDER BY waitlist_position NULLS LAST, created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Firing on_waitlist_update_resequence, which closes the gap this leaves behind.
  UPDATE public.enrollments
     SET status = 'pending',
         waitlist_position = NULL,
         updated_at = now()
   WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resequence_class_waitlist(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resequence_class_waitlist(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resequence_class_waitlist(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resequence_class_waitlist(uuid) TO service_role;

-- Functions are executable by PUBLIC unless revoked, and this one is SECURITY
-- DEFINER, so lock it down too. Calling it outside a trigger errors out ("trigger
-- functions can only be called as triggers"), but there is no reason to leave it
-- callable. Trigger firing does not re-check EXECUTE, so the triggers still work.
REVOKE EXECUTE ON FUNCTION public.resequence_waitlist_on_removal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resequence_waitlist_on_removal() FROM anon;
REVOKE EXECUTE ON FUNCTION public.resequence_waitlist_on_removal() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO service_role;
