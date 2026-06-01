-- pgTAP tests for public.add_to_waitlist() — atomic, gated waitlist-add.
--
-- Verifies the function enforces class publication, teacher blocks, capacity
-- (must be full), duplicate rejection, position assignment, and cancelled-row
-- reactivation. Errors are discriminated by HINT.
--
-- Run via `supabase test db`. All changes roll back at the end of the
-- transaction.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(14);

-- ── Helper ──────────────────────────────────────────────────────────────────

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

-- Capture the HINT of an exception raised by a function call. Returns NULL if
-- the call succeeded.
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

SELECT mk_user('11111111-1111-1111-1111-1111111111a1'::uuid);  -- parent A
SELECT mk_user('11111111-1111-1111-1111-1111111111a2'::uuid);  -- parent B
SELECT mk_user('11111111-1111-1111-1111-1111111111a3'::uuid);  -- parent C
SELECT mk_user('22222222-2222-2222-2222-222222222201'::uuid);  -- teacher
SELECT mk_user('22222222-2222-2222-2222-222222222202'::uuid);  -- other teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id IN (
   '22222222-2222-2222-2222-222222222201',
   '22222222-2222-2222-2222-222222222202'
 );

-- Two classes: one published (full), one draft (used for the publication test).
INSERT INTO public.classes (id, teacher_id, name, capacity, status) VALUES
  ('33333333-3333-3333-3333-333333333301',
   '22222222-2222-2222-2222-222222222201',
   'Full Class', 1, 'published'),
  ('33333333-3333-3333-3333-333333333302',
   '22222222-2222-2222-2222-222222222201',
   'Draft Class', 1, 'draft');

INSERT INTO public.family_members (id, parent_id, first_name, last_name, email) VALUES
  ('44444444-4444-4444-4444-4444444444a1', '11111111-1111-1111-1111-1111111111a1', 'Filler', 'Kid',  'filler@test.test'),
  ('44444444-4444-4444-4444-4444444444a2', '11111111-1111-1111-1111-1111111111a2', 'Wait',   'Kid',  'wait1@test.test'),
  ('44444444-4444-4444-4444-4444444444a3', '11111111-1111-1111-1111-1111111111a3', 'Wait2',  'Kid',  'wait2@test.test');

-- Fill the published class so capacity is exhausted (capacity=1, 1 pending).
INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position) VALUES
  ('55555555-5555-5555-5555-5555555555f1',
   '44444444-4444-4444-4444-4444444444a1',
   '33333333-3333-3333-3333-333333333301',
   'pending', NULL);

SELECT set_config('request.jwt.claims', '', true);  -- service_role context

-- ── Tests ───────────────────────────────────────────────────────────────────

-- 1. Class not found → HINT WL_CLASS_NOT_FOUND.
SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '99999999-9999-9999-9999-999999999999'::uuid,
      '44444444-4444-4444-4444-4444444444a2'::uuid
    )$sql$
  ),
  'WL_CLASS_NOT_FOUND',
  'missing class -> WL_CLASS_NOT_FOUND'
);

-- 2. Class not published → HINT WL_NOT_PUBLISHED.
SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333302'::uuid,
      '44444444-4444-4444-4444-4444444444a2'::uuid
    )$sql$
  ),
  'WL_NOT_PUBLISHED',
  'draft class -> WL_NOT_PUBLISHED'
);

-- 3. Teacher block in place → HINT WL_BLOCKED.
INSERT INTO public.class_blocks (id, teacher_id, student_id) VALUES
  ('66666666-6666-6666-6666-666666666601',
   '22222222-2222-2222-2222-222222222201',
   '44444444-4444-4444-4444-4444444444a2');

SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333301'::uuid,
      '44444444-4444-4444-4444-4444444444a2'::uuid
    )$sql$
  ),
  'WL_BLOCKED',
  'teacher-blocked student -> WL_BLOCKED'
);

DELETE FROM public.class_blocks
 WHERE id = '66666666-6666-6666-6666-666666666601';

-- 4. Class has open seats → HINT WL_SEATS_OPEN.
UPDATE public.enrollments SET status = 'cancelled'
 WHERE id = '55555555-5555-5555-5555-5555555555f1';

SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333301'::uuid,
      '44444444-4444-4444-4444-4444444444a2'::uuid
    )$sql$
  ),
  'WL_SEATS_OPEN',
  'open seats -> WL_SEATS_OPEN'
);

-- Re-fill the class for subsequent tests.
UPDATE public.enrollments SET status = 'pending'
 WHERE id = '55555555-5555-5555-5555-5555555555f1';

-- 5. Successful add to an empty waitlist → returns a row, position=1.
SELECT is(
  (public.add_to_waitlist(
    '33333333-3333-3333-3333-333333333301'::uuid,
    '44444444-4444-4444-4444-4444444444a2'::uuid
  )).waitlist_position,
  1,
  'first waitlist add -> position 1'
);

-- 6. The row is waitlisted.
SELECT is(
  (SELECT status FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444a2'
      AND class_id = '33333333-3333-3333-3333-333333333301')::text,
  'waitlisted',
  'inserted row has status=waitlisted'
);

-- 7. Second add → position 2.
SELECT is(
  (public.add_to_waitlist(
    '33333333-3333-3333-3333-333333333301'::uuid,
    '44444444-4444-4444-4444-4444444444a3'::uuid
  )).waitlist_position,
  2,
  'second waitlist add -> position 2'
);

-- 8. Duplicate (already waitlisted) → HINT WL_DUPLICATE_WAITLISTED.
SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333301'::uuid,
      '44444444-4444-4444-4444-4444444444a2'::uuid
    )$sql$
  ),
  'WL_DUPLICATE_WAITLISTED',
  'already waitlisted -> WL_DUPLICATE_WAITLISTED'
);

-- 9. Duplicate (already pending) → HINT WL_DUPLICATE_ACTIVE.
SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333301'::uuid,
      '44444444-4444-4444-4444-4444444444a1'::uuid
    )$sql$
  ),
  'WL_DUPLICATE_ACTIVE',
  'already pending -> WL_DUPLICATE_ACTIVE'
);

-- 10. Duplicate (already confirmed) → HINT WL_DUPLICATE_ACTIVE.
UPDATE public.enrollments SET status = 'confirmed'
 WHERE id = '55555555-5555-5555-5555-5555555555f1';

SELECT is(
  capture_hint(
    $sql$SELECT public.add_to_waitlist(
      '33333333-3333-3333-3333-333333333301'::uuid,
      '44444444-4444-4444-4444-4444444444a1'::uuid
    )$sql$
  ),
  'WL_DUPLICATE_ACTIVE',
  'already confirmed -> WL_DUPLICATE_ACTIVE'
);

-- 11. Cancelled row gets reactivated as waitlisted. Set up: cancel the second
--     waitlisted row, then re-add the same student.
UPDATE public.enrollments SET status = 'cancelled', waitlist_position = NULL
 WHERE student_id = '44444444-4444-4444-4444-4444444444a3'
   AND class_id = '33333333-3333-3333-3333-333333333301';

-- After cancelling position 2, the first waitlisted (student a2) still has
-- position 1. Re-adding a3 should give them position 2 (max+1).
SELECT is(
  (public.add_to_waitlist(
    '33333333-3333-3333-3333-333333333301'::uuid,
    '44444444-4444-4444-4444-4444444444a3'::uuid
  )).waitlist_position,
  2,
  'reactivated cancelled row -> max+1 position'
);

-- 12. Reactivated row has status=waitlisted (not stuck on cancelled).
SELECT is(
  (SELECT status FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444a3'
      AND class_id = '33333333-3333-3333-3333-333333333301')::text,
  'waitlisted',
  'reactivated row has status=waitlisted'
);

-- 13. promote_waitlist_one bumps updated_at on shifted rows (P2-5 verification).
--     Setup: cancel the confirmed row to open a seat, then promote and verify
--     the position-2 row (a3) got an updated_at refresh as it shifted to 1.
UPDATE public.enrollments SET status = 'cancelled'
 WHERE id = '55555555-5555-5555-5555-5555555555f1';

-- Pin the position-2 row's updated_at to a known-old sentinel. now() is frozen
-- to transaction-start time for the whole BEGIN..ROLLBACK, so we cannot detect
-- the bump by comparing against an earlier now(); the migration sets the
-- shifted row's updated_at = now() (~2026), which must exceed this sentinel.
UPDATE public.enrollments SET updated_at = 'epoch'::timestamptz
 WHERE student_id = '44444444-4444-4444-4444-4444444444a3'
   AND class_id = '33333333-3333-3333-3333-333333333301';

SELECT public.promote_waitlist_one('33333333-3333-3333-3333-333333333301'::uuid);

SELECT ok(
  (SELECT updated_at FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444a3'
      AND class_id = '33333333-3333-3333-3333-333333333301')
    > 'epoch'::timestamptz,
  'promote shift bumps updated_at on shifted row'
);

-- 14. After the promote+shift above, the shifted row's position is 1.
SELECT is(
  (SELECT waitlist_position FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444a3'
      AND class_id = '33333333-3333-3333-3333-333333333301'),
  1,
  'shifted row -> waitlist_position 1'
);

SELECT * FROM finish();
ROLLBACK;
