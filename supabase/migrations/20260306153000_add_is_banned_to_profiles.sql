-- Add is_banned column to profiles table
-- Used to filter banned users from admin views
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
