-- pgTAP tests for public.promote_waitlist_one() — atomic, capacity-aware
-- waitlist promotion.
--
-- Verifies the function correctly returns NULL when there is no room or no
-- one waitlisted, promotes the lowest-position waitlisted row, decrements
-- the remaining positions to stay contiguous, and ignores cancelled rows
-- both for the seat count and as promotion candidates.
--
-- Run via `supabase test db` (requires `supabase start` to have brought up
-- the local stack). All changes roll back at the end of the transaction.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(11);

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

SELECT mk_user('11111111-1111-1111-1111-1111111111aa'::uuid);
SELECT mk_user('11111111-1111-1111-1111-1111111111bb'::uuid);
SELECT mk_user('11111111-1111-1111-1111-1111111111cc'::uuid);
SELECT mk_user('11111111-1111-1111-1111-1111111111dd'::uuid);
SELECT mk_user('11111111-1111-1111-1111-1111111111ee'::uuid);
SELECT mk_user('22222222-2222-2222-2222-222222222222'::uuid);  -- teacher

UPDATE public.profiles SET role = 'teacher'
 WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO public.classes (id, teacher_id, name, capacity, status)
VALUES ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        'Promote Test', 2, 'published');

INSERT INTO public.family_members (id, parent_id, first_name, last_name, email) VALUES
  ('44444444-4444-4444-4444-4444444444aa', '11111111-1111-1111-1111-1111111111aa', 'A', 'Student', 'a@test.test'),
  ('44444444-4444-4444-4444-4444444444bb', '11111111-1111-1111-1111-1111111111bb', 'B', 'Student', 'b@test.test'),
  ('44444444-4444-4444-4444-4444444444cc', '11111111-1111-1111-1111-1111111111cc', 'C', 'Student', 'c@test.test'),
  ('44444444-4444-4444-4444-4444444444dd', '11111111-1111-1111-1111-1111111111dd', 'D', 'Student', 'd@test.test'),
  ('44444444-4444-4444-4444-4444444444ee', '11111111-1111-1111-1111-1111111111ee', 'E', 'Student', 'e@test.test');

SELECT set_config('request.jwt.claims', '', true);  -- service_role context

-- ── Tests ───────────────────────────────────────────────────────────────────

-- 1. Empty waitlist on an empty class → NULL.
SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid) IS NULL,
  'empty waitlist + open class -> NULL'
);

-- 2. Class at capacity with someone waitlisted → NULL.
INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position) VALUES
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-4444444444aa', '33333333-3333-3333-3333-333333333333', 'pending',    NULL),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-4444444444bb', '33333333-3333-3333-3333-333333333333', 'pending',    NULL),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-4444444444cc', '33333333-3333-3333-3333-333333333333', 'waitlisted', 1);

SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid) IS NULL,
  'class full (2 of 2 pending) + 1 waitlisted -> NULL'
);

-- 3. Cancel one pending → seat opens. Add a second waitlisted at position 2.
UPDATE public.enrollments SET status = 'cancelled'
 WHERE id = '55555555-5555-5555-5555-555555555502';

INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position) VALUES
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-4444444444dd', '33333333-3333-3333-3333-333333333333', 'waitlisted', 2);

-- promote should return the position-1 row (student C).
SELECT is(
  (public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid)).id,
  '55555555-5555-5555-5555-555555555503'::uuid,
  'promote returns the position-1 row (student C)'
);

-- 4. C's status is now pending.
SELECT is(
  (SELECT status FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-555555555503')::text,
  'pending',
  'promoted row -> pending'
);

-- 5. C's waitlist_position is NULL.
SELECT ok(
  (SELECT waitlist_position FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-555555555503') IS NULL,
  'promoted row -> waitlist_position NULL'
);

-- 6. D (was at position 2) shifts down to position 1 — list stays contiguous.
SELECT is(
  (SELECT waitlist_position FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-555555555504'),
  1,
  'remaining waitlisted shifted from 2 -> 1'
);

-- 7. Class is now full again (A pending, C pending, B cancelled). Next call
--    must NOT promote D even though D is waitlisted.
SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid) IS NULL,
  'class re-filled to capacity -> next promote returns NULL'
);

-- 8. Cancel A → seat opens → D is promoted.
UPDATE public.enrollments SET status = 'cancelled'
 WHERE id = '55555555-5555-5555-5555-555555555501';

SELECT is(
  (public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid)).id,
  '55555555-5555-5555-5555-555555555504'::uuid,
  'with room available, D is promoted next'
);

-- 9. D's status is now pending.
SELECT is(
  (SELECT status FROM public.enrollments
    WHERE id = '55555555-5555-5555-5555-555555555504')::text,
  'pending',
  'D -> pending'
);

-- 10. Waitlist is now empty → next call returns NULL.
SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid) IS NULL,
  'empty waitlist -> NULL'
);

-- 11. Confirmed rows also count toward seats. Set existing rows confirmed,
--     add a fresh waitlisted, expect NULL (no room).
UPDATE public.enrollments SET status = 'confirmed'
 WHERE id IN ('55555555-5555-5555-5555-555555555503',
              '55555555-5555-5555-5555-555555555504');

INSERT INTO public.enrollments (id, student_id, class_id, status, waitlist_position)
VALUES ('55555555-5555-5555-5555-555555555505',
        '44444444-4444-4444-4444-4444444444ee',
        '33333333-3333-3333-3333-333333333333',
        'waitlisted', 1);

SELECT ok(
  public.promote_waitlist_one('33333333-3333-3333-3333-333333333333'::uuid) IS NULL,
  'class full with confirmed rows -> NULL (confirmed counts toward capacity)'
);

SELECT * FROM finish();
ROLLBACK;
