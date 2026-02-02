-- Create schedule pattern type
CREATE TYPE public.schedule_pattern AS ENUM ('Tu/Th', 'Tu', 'Th', 'Wed');

-- Add columns to classes
ALTER TABLE public.classes
ADD COLUMN schedule_pattern public.schedule_pattern,
ADD COLUMN time_block TEXT CHECK (time_block IN ('Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4', 'Block 5'));

-- Create index for filtering by pattern
CREATE INDEX idx_classes_schedule_pattern ON public.classes(schedule_pattern);
