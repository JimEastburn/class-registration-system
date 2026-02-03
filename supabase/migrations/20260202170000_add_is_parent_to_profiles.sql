-- Add is_parent column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_parent BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.profiles.is_parent IS 'Flag to indicate if a user with another role is also a parent';

-- Update existing parents to have is_parent = true
-- This ensures backward compatibility for users who are primary parents
UPDATE public.profiles 
SET is_parent = TRUE 
WHERE role = 'parent';
