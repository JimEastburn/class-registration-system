-- pgTAP tests for public.enroll_student() — family-ownership security guard.
--
-- The function is SECURITY DEFINER and bypasses the enrollments INSERT RLS
-- policy, so it re-enforces ownership internally:
--   * If auth.uid() IS NOT NULL and the student is not a child of auth.uid(),
--     the function RAISES 'Not authorized to enroll this student'.
--   * service_role callers (auth.uid() IS NULL) bypass the check — they are
--     trusted to have performed authorization at the application layer.
--
-- This is the IDOR-prevention test. If this guard ever regresses, any
-- authenticated parent could enroll another family's child by calling the
-- RPC directly. RLS-based tests cannot catch this because the function is
-- SECURITY DEFINER.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(4);

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

-- Two parents (alice and mallory) and a teacher; alice's child is the target
-- student. mallory must NOT be able to enroll alice's child via the RPC.
SELECT mk_user('a11ce000-0000-0000-0000-000000000001'::uuid);  -- parent alice
SELECT mk_user('ba110000-0000-0000-0000-000000000002'::uuid);  -- parent mallory
SELECT mk_user('7eac0000-0000-0000-0000-000000000003'::uuid);  -- teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id = '7eac0000-0000-0000-0000-000000000003';

INSERT INTO public.classes (id, teacher_id, name, capacity, status)
VALUES ('0a55c000-0000-0000-0000-000000000004',
        '7eac0000-0000-0000-0000-000000000003',
        'Ownership Test', 10, 'published');

-- family_members.email is NOT NULL with no default in this schema, so supply it.
INSERT INTO public.family_members (id, parent_id, first_name, last_name, email)
VALUES ('5d000000-0000-0000-0000-000000000005',
        'a11ce000-0000-0000-0000-000000000001',  -- belongs to alice
        'Alice', 'Kid', 'alice-kid@test.test');

-- ── Tests ───────────────────────────────────────────────────────────────────

-- 1. mallory (non-owner) tries to enroll alice's child → RAISE.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"ba110000-0000-0000-0000-000000000002"}', true);

SELECT throws_ok(
  $$SELECT public.enroll_student(
      '5d000000-0000-0000-0000-000000000005'::uuid,
      '0a55c000-0000-0000-0000-000000000004'::uuid)$$,
  'Not authorized to enroll this student',
  'non-owner (authenticated) enrolling another family''s child -> RAISE'
);

-- 2. No enrollment row was created by the failed call.
SELECT is(
  (SELECT count(*) FROM public.enrollments
    WHERE student_id = '5d000000-0000-0000-0000-000000000005'),
  0::bigint,
  'failed ownership check creates no row'
);

-- 3. alice (the owner) enrolls her child → succeeds (status pending).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a11ce000-0000-0000-0000-000000000001"}', true);

SELECT is(
  (public.enroll_student(
     '5d000000-0000-0000-0000-000000000005'::uuid,
     '0a55c000-0000-0000-0000-000000000004'::uuid)).status::text,
  'pending',
  'owner enrolling own child -> pending (guard passes)'
);

-- 4. service_role context (auth.uid() IS NULL) bypasses the guard. Reset the
-- enrollment and call from a "service" context with the wrong-looking student.
DELETE FROM public.enrollments
 WHERE student_id = '5d000000-0000-0000-0000-000000000005';

SELECT set_config('request.jwt.claims', '', true);  -- null auth.uid()

SELECT is(
  (public.enroll_student(
     '5d000000-0000-0000-0000-000000000005'::uuid,
     '0a55c000-0000-0000-0000-000000000004'::uuid)).status::text,
  'pending',
  'service_role (null auth.uid()) bypasses ownership guard (trusted caller)'
);

SELECT * FROM finish();
ROLLBACK;
