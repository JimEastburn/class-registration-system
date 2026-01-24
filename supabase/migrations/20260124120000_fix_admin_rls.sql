-- Migration: 20260124120000_fix_admin_rls
-- Description: Add comprehensive RLS policies for Admin users across key tables.
-- Created: 2026-01-24

-- 1. Create a secure function to check if the current user is an admin.
--    This is marked SECURITY DEFINER to bypass RLS on the profiles table itself
--    to avoid infinite recursion when querying the 'profiles' table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Add Admin Policies to Key Tables

-- PROFILES
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete all profiles"
    ON public.profiles FOR DELETE
    USING (is_admin());

-- FAMILY_MEMBERS
CREATE POLICY "Admins can view all family members"
    ON public.family_members FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert family members"
    ON public.family_members FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update all family members"
    ON public.family_members FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete all family members"
    ON public.family_members FOR DELETE
    USING (is_admin());

-- CLASSES
-- Note: 'Anyone can view active classes' already exists, but admins need to see draft/cancelled too.
CREATE POLICY "Admins can view all classes"
    ON public.classes FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert classes"
    ON public.classes FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update all classes"
    ON public.classes FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete all classes"
    ON public.classes FOR DELETE
    USING (is_admin());

-- ENROLLMENTS
CREATE POLICY "Admins can view all enrollments"
    ON public.enrollments FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert enrollments"
    ON public.enrollments FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update all enrollments"
    ON public.enrollments FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete all enrollments"
    ON public.enrollments FOR DELETE
    USING (is_admin());

-- PAYMENTS
CREATE POLICY "Admins can view all payments"
    ON public.payments FOR SELECT
    USING (is_admin());

CREATE POLICY "Admins can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update all payments"
    ON public.payments FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete all payments"
    ON public.payments FOR DELETE
    USING (is_admin());
