-- Fix: Drop the inline teacher policy that causes infinite recursion.
--
-- The policy "Teachers can view family members enrolled in their classes"
-- (added in 20260218045500) queries `enrollments` with inline SQL.
-- Because enrollments' own RLS policies reference `family_members`,
-- PostgreSQL detects infinite recursion:
--   family_members → enrollments → family_members → …
--
-- The original SECURITY DEFINER–based policy from 20260201205611
-- ("Teachers can view enrolled students family") already handles
-- the same logic via is_teacher_of_student(), which bypasses RLS.

DROP POLICY IF EXISTS "Teachers can view family members enrolled in their classes"
  ON public.family_members;
