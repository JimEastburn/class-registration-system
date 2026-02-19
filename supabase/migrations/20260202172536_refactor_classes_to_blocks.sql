-- Refactor classes to use Block-based scheduling (duplicate-safe version)
-- This is a duplicate of 20260202120000_refactor_classes_to_blocks.sql
-- Using IF NOT EXISTS / IF EXISTS to handle idempotency

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS day TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS block TEXT;

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS block TEXT;

-- Drop time columns from calendar_events (safe: only if they exist)
ALTER TABLE public.calendar_events DROP COLUMN IF EXISTS start_time;
ALTER TABLE public.calendar_events DROP COLUMN IF EXISTS end_time;

-- indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_classes_day_block ON public.classes(day, block);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_block ON public.calendar_events(date, block);
