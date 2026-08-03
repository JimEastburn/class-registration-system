-- Add age column to profiles table
-- Collected at registration for self-registering students so teachers can
-- confirm class content is age-appropriate. Null for parents and teachers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age > 0 AND age <= 120);
