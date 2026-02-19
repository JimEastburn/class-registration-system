-- Add current_enrollment column to classes table.
-- The update_enrollment_count() trigger function references this column
-- but it was never created, causing confirmed enrollment inserts to fail.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS current_enrollment INTEGER NOT NULL DEFAULT 0;
