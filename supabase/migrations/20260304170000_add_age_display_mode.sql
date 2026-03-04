-- Add age_display_mode column to classes table
-- Controls how age info is displayed on the parent browse page:
--   'age_range' = show only "Ages x–y"
--   'pills'     = show only Elementary/MS/HS pills
--   'both'      = show both (default)
ALTER TABLE classes
  ADD COLUMN age_display_mode text NOT NULL DEFAULT 'both'
  CONSTRAINT classes_age_display_mode_check CHECK (age_display_mode IN ('age_range', 'pills', 'both'));
