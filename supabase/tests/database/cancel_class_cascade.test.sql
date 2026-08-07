-- pgTAP tests for the cancelled-class invariant: a cancelled class holds no
-- active enrollments.
--
-- Covers both halves of 20260806120000_cancel_enrollments_with_class.sql:
-- on_class_cancel_cascade_enrollments (cancelling a class cancels everyone in
-- it, whatever code path did the cancelling) and
-- on_enrollment_reject_cancelled_class (nothing may enter an active status in a
-- cancelled class afterwards). Rejections are discriminated by HINT.
--
-- Note on scope, matching the other suites here: these run as the migration
-- role, so RLS is not enforced and this file does not reproduce the specific
-- production bug it was written for -- cancelClass() updating enrollments
-- through the RLS client, which silently matched zero rows for a teacher. What
-- it does prove is that the cascade fires from a plain
-- `UPDATE classes SET status = 'cancelled'`, which is the statement every cancel
-- path ends in, and that the cascade function is SECURITY DEFINER so RLS cannot
-- swallow it. Cancelling a class while signed in as a teacher is still worth a
-- manual check against a real database.
--
-- Run via `supabase test db` (requires `supabase start` to have brought up the
-- local stack). All changes roll back at the end of the transaction.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(15);

-- ── Helpers ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mk_user(p_id uuid) RETURNS uuid AS $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'u-' || p_id::text || '@test.test',
    '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
  );
  RETURN p_id;
END;
$$ LANGUAGE plpgsql;

-- Capture the HINT of an exception raised by a statement. Returns NULL if the
-- statement succeeded.
CREATE OR REPLACE FUNCTION capture_hint(p_sql text) RETURNS text AS $$
DECLARE
  v_hint text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RETURN NULL;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    RETURN v_hint;
  END;
END;
$$ LANGUAGE plpgsql;

-- ── Fixtures ────────────────────────────────────────────────────────────────

SELECT mk_user('11111111-1111-1111-1111-1111111111a1'::uuid);  -- parent
SELECT mk_user('22222222-2222-2222-2222-222222222201'::uuid);  -- teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id = '22222222-2222-2222-2222-222222222201';

-- C1 gets cancelled mid-test. C2 is the untouched control. C3 starts cancelled
-- so the guard can be exercised against it. C4 is empty.
INSERT INTO public.classes (id, teacher_id, name, capacity, status) VALUES
  ('33333333-3333-3333-3333-333333333301',
   '22222222-2222-2222-2222-222222222201', 'Cascade Class', 2, 'published'),
  ('33333333-3333-3333-3333-333333333302',
   '22222222-2222-2222-2222-222222222201', 'Control Class', 2, 'published'),
  ('33333333-3333-3333-3333-333333333303',
   '22222222-2222-2222-2222-222222222201', 'Already Cancelled', 2, 'cancelled'),
  ('33333333-3333-3333-3333-333333333304',
   '22222222-2222-2222-2222-222222222201', 'Empty Class', 2, 'published');

INSERT INTO public.family_members (id, parent_id, first_name, last_name, email) VALUES
  ('44444444-4444-4444-4444-4444444444a1', '11111111-1111-1111-1111-1111111111a1', 'Kid', 'One',   'k1@test.test'),
  ('44444444-4444-4444-4444-4444444444a2', '11111111-1111-1111-1111-1111111111a1', 'Kid', 'Two',   'k2@test.test'),
  ('44444444-4444-4444-4444-4444444444a3', '11111111-1111-1111-1111-1111111111a1', 'Kid', 'Three', 'k3@test.test'),
  ('44444444-4444-4444-4444-4444444444a4', '11111111-1111-1111-1111-1111111111a1', 'Kid', 'Four',  'k4@test.test'),
  ('44444444-4444-4444-4444-4444444444a5', '11111111-1111-1111-1111-1111111111a1', 'Kid', 'Five',  'k5@test.test');

-- C1: one confirmed, one pending, two waitlisted. C2: one confirmed control.
-- C3: one already-cancelled row, used for the guard tests.
INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position) VALUES
  ('55555555-5555-5555-5555-5555555555e1', '44444444-4444-4444-4444-4444444444a1',
   '33333333-3333-3333-3333-333333333301', 'confirmed',  NULL),
  ('55555555-5555-5555-5555-5555555555e2', '44444444-4444-4444-4444-4444444444a2',
   '33333333-3333-3333-3333-333333333301', 'pending',    NULL),
  ('55555555-5555-5555-5555-5555555555e3', '44444444-4444-4444-4444-4444444444a3',
   '33333333-3333-3333-3333-333333333301', 'waitlisted', 1),
  ('55555555-5555-5555-5555-5555555555e4', '44444444-4444-4444-4444-4444444444a4',
   '33333333-3333-3333-3333-333333333301', 'waitlisted', 2),
  ('55555555-5555-5555-5555-5555555555e5', '44444444-4444-4444-4444-4444444444a5',
   '33333333-3333-3333-3333-333333333302', 'confirmed',  NULL),
  ('55555555-5555-5555-5555-5555555555e6', '44444444-4444-4444-4444-4444444444a1',
   '33333333-3333-3333-3333-333333333303', 'cancelled',  NULL);

SELECT set_config('request.jwt.claims', '', true);  -- service_role context

-- ── The cascade ─────────────────────────────────────────────────────────────

-- This is the whole point: a bare status update, with no enrollment handling of
-- its own, must empty the class.
UPDATE public.classes
   SET status = 'cancelled'
 WHERE id = '33333333-3333-3333-3333-333333333301';

-- 1. The confirmed enrollment is cancelled.
SELECT is(
  (SELECT status::text FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-5555555555e1'),
  'cancelled',
  'cancelling a class cancels its confirmed enrollment'
);

-- 2. The pending enrollment is cancelled.
SELECT is(
  (SELECT status::text FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-5555555555e2'),
  'cancelled',
  'cancelling a class cancels its pending enrollment'
);

-- 3. Both waitlisted enrollments are cancelled.
SELECT is(
  (SELECT count(*) FROM public.enrollments
    WHERE class_id = '33333333-3333-3333-3333-333333333301'
      AND status = 'waitlisted'),
  0::bigint,
  'cancelling a class empties its waitlist'
);

-- 4. Waitlist positions are cleared, so no stale number can collide later.
SELECT is(
  (SELECT count(*) FROM public.enrollments
    WHERE class_id = '33333333-3333-3333-3333-333333333301'
      AND waitlist_position IS NOT NULL),
  0::bigint,
  'cancelling a class clears waitlist_position'
);

-- 5. The control class is untouched.
SELECT is(
  (SELECT status::text FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-5555555555e5'),
  'confirmed',
  'cancelling a class leaves other classes alone'
);

-- 6. update_enrollment_count() ran on the way through, so the denormalized
-- display count agrees.
SELECT is(
  (SELECT current_enrollment FROM public.classes
    WHERE id = '33333333-3333-3333-3333-333333333301'),
  0,
  'cancelling a class drives current_enrollment to 0'
);

-- 7. Non-recursion / WHEN clause: a later update to an already-cancelled class
-- must not re-run the cascade or error out. update_enrollment_count() writes
-- back to classes during the cascade, so a WHEN clause keyed on NEW.status
-- alone would re-enter this trigger once per cancelled enrollment.
UPDATE public.classes
   SET name = 'Cascade Class (renamed)'
 WHERE id = '33333333-3333-3333-3333-333333333301';

SELECT is(
  (SELECT name FROM public.classes
    WHERE id = '33333333-3333-3333-3333-333333333301'),
  'Cascade Class (renamed)',
  'an already-cancelled class can still be edited'
);

-- 8. Cancelling a class with no enrollments is a no-op, not an error.
SELECT lives_ok(
  $sql$UPDATE public.classes SET status = 'cancelled'
        WHERE id = '33333333-3333-3333-3333-333333333304'$sql$,
  'cancelling an empty class succeeds'
);

-- ── The guard ───────────────────────────────────────────────────────────────

-- 9. A fresh active enrollment cannot be inserted into a cancelled class.
SELECT is(
  capture_hint(
    $sql$INSERT INTO public.enrollments (student_id, class_id, status)
         VALUES ('44444444-4444-4444-4444-4444444444a2',
                 '33333333-3333-3333-3333-333333333303',
                 'pending')$sql$
  ),
  'EN_CLASS_CANCELLED',
  'INSERT of an active enrollment into a cancelled class -> EN_CLASS_CANCELLED'
);

-- 10. A cancelled row cannot be reactivated inside a cancelled class. This is
-- the direct-UPDATE path the Stripe webhook and payments actions take.
SELECT is(
  capture_hint(
    $sql$UPDATE public.enrollments SET status = 'confirmed'
          WHERE id = '55555555-5555-5555-5555-5555555555e6'$sql$
  ),
  'EN_CLASS_CANCELLED',
  'reactivating an enrollment in a cancelled class -> EN_CLASS_CANCELLED'
);

-- 11. The guard does not over-block: setting a row to cancelled must still
-- work, since that is how a stranded row gets repaired.
SELECT lives_ok(
  $sql$UPDATE public.enrollments SET status = 'cancelled'
        WHERE id = '55555555-5555-5555-5555-5555555555e1'$sql$,
  'cancelling an enrollment in a cancelled class still succeeds'
);

-- 12. Nor does it fire on non-status columns: the UPDATE OF column list keeps
-- it off deposit_paid toggles and similar.
SELECT lives_ok(
  $sql$UPDATE public.enrollments SET deposit_paid = true
        WHERE id = '55555555-5555-5555-5555-5555555555e6'$sql$,
  'updating a non-status column in a cancelled class still succeeds'
);

-- ── The RPCs ────────────────────────────────────────────────────────────────

-- 13. enroll_student rejects a cancelled class with a mappable hint, rather
-- than letting the caller hit a raw trigger error.
SELECT is(
  capture_hint(
    $sql$SELECT public.enroll_student(
      '44444444-4444-4444-4444-4444444444a2'::uuid,
      '33333333-3333-3333-3333-333333333303'::uuid)$sql$
  ),
  'EN_CLASS_CANCELLED',
  'enroll_student into a cancelled class -> EN_CLASS_CANCELLED'
);

-- 14. promote_waitlist_one returns NULL rather than raising: its callers invoke
-- it as a side effect of refunds and cancellations, where an exception would
-- turn a completed operation into a visible error.
SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333303'::uuid) IS NULL,
  'promote_waitlist_one on a cancelled class -> NULL'
);

-- ── The invariant itself ────────────────────────────────────────────────────

-- 15. Nothing anywhere in the database violates it.
SELECT is(
  (SELECT count(*)
     FROM public.enrollments e
     JOIN public.classes c ON c.id = e.class_id
    WHERE c.status = 'cancelled'
      AND e.status IN ('confirmed', 'pending', 'waitlisted')),
  0::bigint,
  'no active enrollment survives in any cancelled class'
);

SELECT * FROM finish();
ROLLBACK;
