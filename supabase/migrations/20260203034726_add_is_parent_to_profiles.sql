-- Add is_parent to profiles (duplicate-safe version)
-- This is a duplicate of 20260202170000_add_is_parent_to_profiles.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_parent BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.profiles.is_parent IS 'Flag to indicate if a user with another role is also a parent';
UPDATE public.profiles SET is_parent = TRUE WHERE role = 'parent';
