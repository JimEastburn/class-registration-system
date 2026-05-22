-- pgTAP tests for public.enroll_student() — capacity boundary, position math,
-- cancelled-row exclusion.
--
-- Verifies the function correctly decides pending vs. waitlisted based on the
-- true class-wide seat count (confirmed + pending), that cancelled and
-- waitlisted rows do NOT consume a seat, and that waitlist_position increments.
--
-- Run via `supabase test db` (requires `supabase start` to have brought up the
-- local stack). All inserts roll back at the end of the transaction.

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

SELECT mk_user('11111111-1111-1111-1111-1111111111aa'::uuid);  -- parent A
SELECT mk_user('11111111-1111-1111-1111-1111111111bb'::uuid);  -- parent B
SELECT mk_user('11111111-1111-1111-1111-1111111111cc'::uuid);  -- parent C
SELECT mk_user('11111111-1111-1111-1111-1111111111dd'::uuid);  -- parent D
SELECT mk_user('11111111-1111-1111-1111-1111111111ee'::uuid);  -- parent E
SELECT mk_user('11111111-1111-1111-1111-1111111111ff'::uuid);  -- parent F
SELECT mk_user('22222222-2222-2222-2222-222222222222'::uuid);  -- teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO public.classes (id, teacher_id, name, capacity, status)
VALUES ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        'Capacity Test', 2, 'published');

-- family_members.email is NOT NULL with no default in this schema, so supply it.
INSERT INTO public.family_members (id, parent_id, first_name, last_name, email) VALUES
  ('44444444-4444-4444-4444-4444444444aa', '11111111-1111-1111-1111-1111111111aa', 'A', 'Student', 'a@test.test'),
  ('44444444-4444-4444-4444-4444444444bb', '11111111-1111-1111-1111-1111111111bb', 'B', 'Student', 'b@test.test'),
  ('44444444-4444-4444-4444-4444444444cc', '11111111-1111-1111-1111-1111111111cc', 'C', 'Student', 'c@test.test'),
  ('44444444-4444-4444-4444-4444444444dd', '11111111-1111-1111-1111-1111111111dd', 'D', 'Student', 'd@test.test'),
  ('44444444-4444-4444-4444-4444444444ee', '11111111-1111-1111-1111-1111111111ee', 'E', 'Student', 'e@test.test'),
  ('44444444-4444-4444-4444-4444444444ff', '11111111-1111-1111-1111-1111111111ff', 'F', 'Student', 'f@test.test');

-- Run as service_role context (auth.uid() is NULL) so the ownership guard is
-- bypassed; ownership behaviour has its own test file.
SELECT set_config('request.jwt.claims', '', true);

-- ── Tests ───────────────────────────────────────────────────────────────────

-- 1. First enrollment into an empty class → pending.
SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444aa'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).status::text,
  'pending',
  '1st enrollment (0 of 2 seats used) -> pending'
);

-- 2. Second enrollment → pending (1 of 2 used).
SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444bb'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).status::text,
  'pending',
  '2nd enrollment (1 of 2 seats used) -> pending'
);

-- 3. Third enrollment → waitlisted (capacity reached).
SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444cc'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).status::text,
  'waitlisted',
  '3rd enrollment (class full) -> waitlisted'
);

-- 4. The first waitlisted gets position 1.
SELECT is(
  (SELECT waitlist_position FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444cc'
      AND class_id = '33333333-3333-3333-3333-333333333333'),
  1,
  '1st waitlisted -> waitlist_position 1'
);

-- 5. Fourth enrollment → waitlisted, position 2.
SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444dd'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).waitlist_position,
  2,
  '4th enrollment -> waitlist_position 2'
);

-- 6. Cancel student A's enrollment; cancelled rows must NOT count toward the
-- seat total. The next enrollment of a new student should land pending again.
UPDATE public.enrollments
   SET status = 'cancelled'
 WHERE student_id = '44444444-4444-4444-4444-4444444444aa'
   AND class_id = '33333333-3333-3333-3333-333333333333';

SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444ee'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).status::text,
  'pending',
  'cancelled rows do NOT consume a seat (next enroll -> pending)'
);

-- 7. Waitlisted rows also do NOT consume a seat. Class is now: B pending,
-- C waitlisted (pos 1), D waitlisted (pos 2), E pending, A cancelled.
-- Seats taken = pending(B, E) = 2 of 2 → next enrollment must waitlist.
SELECT is(
  (public.enroll_student(
     '44444444-4444-4444-4444-4444444444ff'::uuid,
     '33333333-3333-3333-3333-333333333333'::uuid)).status::text,
  'waitlisted',
  'waitlisted rows do NOT consume a seat (next enroll -> waitlisted)'
);

-- 8. F's waitlist_position = 3 (after C=1, D=2).
SELECT is(
  (SELECT waitlist_position FROM public.enrollments
    WHERE student_id = '44444444-4444-4444-4444-4444444444ff'
      AND class_id = '33333333-3333-3333-3333-333333333333'),
  3,
  'waitlist_position counts existing waitlisted + 1 (F lands at 3)'
);

SELECT * FROM finish();
ROLLBACK;
