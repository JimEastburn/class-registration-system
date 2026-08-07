-- A cancelled class holds no active enrollments.
--
-- Background: production accumulated three enrollments left 'pending' inside
-- cancelled classes, from two independent bugs that both look like success.
--
--   1. cancelClass() ran its enrollment UPDATE through the RLS client. There is
--      no teacher UPDATE policy on enrollments -- teachers get SELECT only, and
--      is_admin() covers admin/super_admin/class_scheduler but not teacher (see
--      20260201205611_enable_rls.sql and 20260223055000_fix_is_admin_include_all_admin_roles.sql).
--      So a teacher cancelling their own class matched zero rows, returned no
--      error, and still flipped classes.status. The audit trail shows it plainly:
--      every teacher-initiated class.cancelled recorded affectedEnrollments: 0,
--      while the one super_admin cancellation recorded 4.
--
--   2. The admin class edit form posts status directly through updateClass(),
--      which wrote 'cancelled' with no enrollment handling and no notification
--      at all. adminUpdateClass() and schedulerUpdateClass() had the same hole.
--
-- Both are being fixed in the server actions. This migration exists because the
-- fix cannot only live there: 'a class was cancelled' and 'an enrollment became
-- active' are written from many places -- six direct writes to enrollments.status
-- alone (the Stripe webhook in three spots, checkout/verify-session, and two in
-- actions/payments.ts), none of which route through enroll_student(). Patching
-- each call site would leave the invariant one forgotten call away from breaking,
-- exactly as argued in 20260804100000_resequence_waitlist_on_removal.sql, so it
-- is enforced in the database as well.
--
-- Two halves: a cascade so cancelling a class empties it no matter who cancelled
-- it, and a guard so nothing can refill it afterwards.
--
-- Note the cascade cannot replace the server action. A trigger cannot send the
-- cancellation email, so cancelClass() remains the only supported way to cancel
-- a class; the generic updaters now reject the transition rather than silently
-- dropping families from a class without telling them.

-- ── Repair ──────────────────────────────────────────────────────────────────

-- The triggers below only govern future transitions, so rows that already
-- violate the invariant would survive forever. Repair rather than RAISE (the
-- approach 20260523200100_waitlist_position_indexes.sql took for duplicate
-- positions): there is exactly one correct end state here and no judgement call
-- to make. Fires on_waitlist_update_resequence and on_enrollment_count_change,
-- which is wanted -- it also corrects classes.current_enrollment.
DO $$
DECLARE
  v_fixed integer;
BEGIN
  WITH repaired AS (
    UPDATE public.enrollments e
       SET status = 'cancelled',
           waitlist_position = NULL,
           updated_at = now()
      FROM public.classes c
     WHERE c.id = e.class_id
       AND c.status = 'cancelled'
       AND e.status IN ('confirmed', 'pending', 'waitlisted')
    RETURNING 1
  )
  SELECT count(*) INTO v_fixed FROM repaired;

  IF v_fixed > 0 THEN
    RAISE NOTICE 'Cancelled % enrollment(s) still active in a cancelled class. SQL sends no email -- those families need contacting manually.', v_fixed;
  END IF;
END;
$$;

-- ── Cascade: cancelling a class cancels everyone in it ──────────────────────

CREATE OR REPLACE FUNCTION public.cancel_enrollments_on_class_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- waitlist_position is nulled alongside the status change, matching every
  -- other path that takes a row off the waitlist (promote_waitlist_one,
  -- adminCancelEnrollment, teacherCancelEnrollment). A retained position would
  -- not violate uq_enrollments_class_waitlist_position -- that index is partial
  -- on status = 'waitlisted' -- but leaving stale numbers behind invites a
  -- collision from any future path that reactivates a cancelled row without
  -- recomputing its position.
  UPDATE public.enrollments
     SET status = 'cancelled',
         waitlist_position = NULL,
         updated_at = now()
   WHERE class_id = NEW.id
     AND status IN ('confirmed', 'pending', 'waitlisted');

  RETURN NULL;
END;
$function$;

-- AFTER, not BEFORE. This trigger updates enrollments, whose
-- on_enrollment_count_change trigger writes classes.current_enrollment on the
-- very row being updated. From a BEFORE trigger that nested write collides with
-- the in-flight command ("tuple to be updated was already modified by an
-- operation triggered by the current command", whose own hint is to use an AFTER
-- trigger). From AFTER, the row-level triggers queue to end of statement and the
-- nested write is an ordinary second update.
--
-- The WHEN clause is what makes this non-recursive: update_enrollment_count()
-- re-enters this trigger once per formerly-confirmed row, but by then OLD.status
-- is already 'cancelled' and the clause is false. Written as a bare
-- NEW.status = 'cancelled' it would re-fire once per enrollment, each pass
-- finding nothing left to do.
--
-- SECURITY DEFINER is load-bearing here rather than boilerplate: it is precisely
-- what makes the cascade work on the teacher path that RLS was silently
-- swallowing.
--
-- Each cancelled waitlist row also fires on_waitlist_update_resequence. Those
-- run at end of statement, by which point the class has no waitlisted rows left,
-- so they are cheap no-ops. Not worth suppressing -- a session flag or a
-- DISABLE TRIGGER dance would cost far more complexity than the two no-op index
-- scans it would save.
DROP TRIGGER IF EXISTS on_class_cancel_cascade_enrollments ON public.classes;
CREATE TRIGGER on_class_cancel_cascade_enrollments
  AFTER UPDATE ON public.classes
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled')
  EXECUTE FUNCTION public.cancel_enrollments_on_class_cancel();

-- ── Guard: nothing may enter an active status in a cancelled class ─────────

CREATE OR REPLACE FUNCTION public.reject_active_enrollment_in_cancelled_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY DEFINER is required for correctness, not convenience. The RLS
  -- policy "Anyone can view published classes" is FOR SELECT USING
  -- (status = 'published'), so as SECURITY INVOKER this lookup would find no row
  -- for a parent and the guard would fall open on exactly the rows it exists to
  -- block.
  --
  -- Deliberately an unlocked read, no FOR SHARE. Taking a class lock here would
  -- invert the lock order used everywhere else (enroll_student and
  -- promote_waitlist_one both lock the class row first, then touch enrollments),
  -- introducing deadlocks on the Stripe payment path. It is also unnecessary:
  -- the concurrent cases are already closed. A concurrent status UPDATE blocks
  -- on the enrollment row lock and is re-qualified by the cascade's
  -- WHERE status IN (...) under READ COMMITTED, and a concurrent INSERT goes
  -- through enroll_student(), which is already serialized behind FOR UPDATE on
  -- the class row.
  IF EXISTS (
    SELECT 1 FROM public.classes
     WHERE id = NEW.class_id
       AND status = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'This class has been cancelled'
      USING HINT = 'EN_CLASS_CANCELLED';
  END IF;

  RETURN NEW;
END;
$function$;

-- Hint-based discrimination, matching add_to_waitlist's WL_* codes
-- (20260523200000). No ERRCODE override, so callers keep using error.hint as the
-- single discriminator across RPC errors, PostgREST table-write errors, and the
-- in-memory fake.
DROP TRIGGER IF EXISTS on_enrollment_reject_cancelled_class ON public.enrollments;
CREATE TRIGGER on_enrollment_reject_cancelled_class
  BEFORE INSERT OR UPDATE OF status, class_id ON public.enrollments
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'pending', 'waitlisted'))
  EXECUTE FUNCTION public.reject_active_enrollment_in_cancelled_class();

-- The WHEN clause and the UPDATE OF column list keep this off every path that
-- should still work: the cascade above and all the cancel paths write
-- status = 'cancelled'; resequence_class_waitlist touches only
-- waitlist_position; updateDepositPaid touches only deposit_paid. A row already
-- stranded active in a cancelled class also stays editable *to* cancelled, which
-- is how it gets repaired.

-- ── enroll_student: friendly rejection before the guard has to fire ────────

-- Unchanged from 20260804090000_fix_enroll_student_waitlist_position.sql except
-- for reading status alongside capacity and rejecting cancelled classes. The
-- trigger above is the actual enforcement; this branch exists so the enrollment
-- actions surface a mappable hint instead of a raw trigger error.
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
  v_capacity     integer;
  v_class_status "ClassStatus";
  v_seats_taken  integer;
  v_status       "EnrollmentStatus";
  v_position     integer;
  v_row          public.enrollments;
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
  SELECT capacity, status INTO v_capacity, v_class_status
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class not found';
  END IF;

  -- Narrowly 'cancelled' rather than <> 'published', which is what
  -- add_to_waitlist checks. adminEnrollStudent legitimately enrols into draft and
  -- completed classes today; tightening that is a separate decision, and this
  -- migration is only responsible for the cancelled-class invariant.
  IF v_class_status = 'cancelled' THEN
    RAISE EXCEPTION 'This class has been cancelled'
      USING HINT = 'EN_CLASS_CANCELLED';
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

-- ── promote_waitlist_one: nobody to promote in a cancelled class ───────────

-- Unchanged from 20260804100000_resequence_waitlist_on_removal.sql except for
-- reading status alongside capacity and returning NULL for cancelled classes.
--
-- NULL rather than RAISE, unlike enroll_student. This function's contract is
-- already "NULL means there was nobody to promote", and every caller but the
-- admin promote button invokes it as a side effect of some other successful
-- operation (cancelEnrollment, adminCancelEnrollment, teacherCancelEnrollment,
-- processRefund, blockStudent). Raising there would turn a completed refund into
-- a visible error. And it is true on its own terms: the cascade has already
-- emptied a cancelled class's waitlist.
CREATE OR REPLACE FUNCTION public.promote_waitlist_one(p_class_id uuid)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_capacity     integer;
  v_class_status "ClassStatus";
  v_seats_taken  integer;
  v_row          public.enrollments;
BEGIN
  SELECT capacity, status INTO v_capacity, v_class_status
  FROM public.classes
  WHERE id = p_class_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_class_status = 'cancelled' THEN
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

-- ── Grants ────────────────────────────────────────────────────────────────

-- Trigger functions are executable by PUBLIC unless revoked, and both are
-- SECURITY DEFINER. Calling them directly errors out ("trigger functions can
-- only be called as triggers"), but there is no reason to leave them callable.
-- Trigger firing does not re-check EXECUTE, so the triggers still work.
REVOKE EXECUTE ON FUNCTION public.cancel_enrollments_on_class_cancel() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_enrollments_on_class_cancel() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_enrollments_on_class_cancel() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_active_enrollment_in_cancelled_class() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_active_enrollment_in_cancelled_class() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_active_enrollment_in_cancelled_class() FROM authenticated;

-- Grants are unchanged by CREATE OR REPLACE, but restate them so this migration
-- is self-contained if replayed against a fresh database.
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.enroll_student(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.promote_waitlist_one(uuid) TO service_role;
