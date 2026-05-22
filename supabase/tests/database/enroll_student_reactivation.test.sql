-- pgTAP tests for public.enroll_student() — ON CONFLICT reactivation + the
-- WHERE-guard that rejects active duplicates.
--
-- Verifies:
--   * A cancelled (student, class) row is reactivated IN PLACE (same id) on
--     re-enrollment.
--   * An active (pending / confirmed / waitlisted) row causes the function to
--     RAISE 'Student is already enrolled in this class' (via the NOT FOUND
--     check that follows ON CONFLICT ... WHERE status='cancelled').
--   * Reactivating into a FULL class produces a waitlisted row with the
--     correct position.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(8);

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

-- ── Fixtures ────────────────────────────────────────────────────────────────

SELECT mk_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid);  -- parent for S1
SELECT mk_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid);  -- parent for S2
SELECT mk_user('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);  -- parent for S3
SELECT mk_user('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid);  -- parent for S4
SELECT mk_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid);  -- teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

INSERT INTO public.classes (id, teacher_id, name, capacity, status)
VALUES ('cccccccc-1111-1111-1111-cccccccccccc',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Reactivation Test', 2, 'published');

-- family_members.email is NOT NULL with no default in this schema, so supply it.
INSERT INTO public.family_members (id, parent_id, first_name, last_name, email) VALUES
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'S1', 'Student', 's1@test.test'),
  ('bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'S2', 'Student', 's2@test.test'),
  ('cccccccc-2222-2222-2222-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'S3', 'Student', 's3@test.test'),
  ('dddddddd-1111-1111-1111-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'S4', 'Student', 's4@test.test');

SELECT set_config('request.jwt.claims', '', true);  -- service_role context

-- ── Tests ───────────────────────────────────────────────────────────────────

-- Pre-seed: S1 has a cancelled enrollment in the class.
INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position)
VALUES ('eeeeeeee-1111-1111-1111-111111111111',
        'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
        'cccccccc-1111-1111-1111-cccccccccccc',
        'cancelled', NULL);

-- 1. Reactivating a cancelled (student, class) row → status pending, SAME id.
SELECT is(
  (public.enroll_student(
     'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
     'cccccccc-1111-1111-1111-cccccccccccc'::uuid)).id,
  'eeeeeeee-1111-1111-1111-111111111111'::uuid,
  'reactivation returns the same enrollment id (in-place UPDATE)'
);

-- 2. The reactivated row's status is now 'pending'.
SELECT is(
  (SELECT status FROM public.enrollments
    WHERE id = 'eeeeeeee-1111-1111-1111-111111111111')::text,
  'pending',
  'reactivated row is now pending'
);

-- 3. Pending duplicate → WHERE guard rejects, function RAISES.
-- (S1 is now pending; a second enroll for the same (student, class) must throw.)
SELECT throws_ok(
  $$SELECT public.enroll_student(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'cccccccc-1111-1111-1111-cccccccccccc'::uuid)$$,
  'Student is already enrolled in this class',
  'pending duplicate raises "already enrolled"'
);

-- 4. Confirmed duplicate also rejected. Move S1 to confirmed and retry.
UPDATE public.enrollments SET status = 'confirmed'
 WHERE id = 'eeeeeeee-1111-1111-1111-111111111111';

SELECT throws_ok(
  $$SELECT public.enroll_student(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'cccccccc-1111-1111-1111-cccccccccccc'::uuid)$$,
  'Student is already enrolled in this class',
  'confirmed duplicate raises "already enrolled"'
);

-- 5. Waitlisted duplicate also rejected. Move S1 to waitlisted and retry.
UPDATE public.enrollments SET status = 'waitlisted', waitlist_position = 1
 WHERE id = 'eeeeeeee-1111-1111-1111-111111111111';

SELECT throws_ok(
  $$SELECT public.enroll_student(
      'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
      'cccccccc-1111-1111-1111-cccccccccccc'::uuid)$$,
  'Student is already enrolled in this class',
  'waitlisted duplicate raises "already enrolled"'
);

-- 6. Reactivating into a FULL class → row becomes waitlisted with correct
-- position. Fill the 2-seat class with S2 and S3, then cancel S1 (currently
-- waitlisted) — wait, S1 is already on the row. Reset S1 to cancelled, then
-- fill seats with S2 (pending) and S3 (pending). S1's re-enroll should
-- waitlist.
UPDATE public.enrollments SET status = 'cancelled', waitlist_position = NULL
 WHERE id = 'eeeeeeee-1111-1111-1111-111111111111';

SELECT public.enroll_student(
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb'::uuid,
  'cccccccc-1111-1111-1111-cccccccccccc'::uuid);
SELECT public.enroll_student(
  'cccccccc-2222-2222-2222-cccccccccccc'::uuid,
  'cccccccc-1111-1111-1111-cccccccccccc'::uuid);

-- Class is now full (S2 pending, S3 pending, S1 cancelled). Re-enrolling S1
-- should reactivate the same row but as 'waitlisted'.
SELECT is(
  (public.enroll_student(
     'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'::uuid,
     'cccccccc-1111-1111-1111-cccccccccccc'::uuid)).status::text,
  'waitlisted',
  'reactivate-into-full -> waitlisted'
);

-- 7. The reactivated row keeps the same id even when going to waitlist.
SELECT is(
  (SELECT id FROM public.enrollments
    WHERE student_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
      AND class_id = 'cccccccc-1111-1111-1111-cccccccccccc'),
  'eeeeeeee-1111-1111-1111-111111111111'::uuid,
  'reactivate-into-full keeps the original id (in-place UPDATE)'
);

-- 8. The reactivated row's waitlist_position = 1 (first waitlisted).
SELECT is(
  (SELECT waitlist_position FROM public.enrollments
    WHERE id = 'eeeeeeee-1111-1111-1111-111111111111'),
  1,
  'reactivate-into-full gets waitlist_position 1'
);

SELECT * FROM finish();
ROLLBACK;
