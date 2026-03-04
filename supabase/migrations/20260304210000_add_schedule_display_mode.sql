-- Add schedule_display_mode column to classes table
-- Controls whether browse page shows Day+Block or "Asynchronous":
--   'day_block'    = show Day and Block rows (default)
--   'asynchronous' = show "Asynchronous" label instead
ALTER TABLE classes
  ADD COLUMN schedule_display_mode text NOT NULL DEFAULT 'day_block'
  CONSTRAINT classes_schedule_display_mode_check CHECK (schedule_display_mode IN ('day_block', 'asynchronous'));
