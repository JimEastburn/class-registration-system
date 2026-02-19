-- Require family member email (duplicate-safe version)
-- This is a duplicate of 20260202160000_require_family_member_email.sql
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.family_members.email IS 'Email address of the family member (required)';
