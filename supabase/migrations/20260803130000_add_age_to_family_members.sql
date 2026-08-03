-- Add age column to family_members table
-- Collected when a parent adds a Student family member so teachers can confirm
-- class content is age-appropriate. Null for Parent/Guardian members.
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age > 0 AND age <= 120);
