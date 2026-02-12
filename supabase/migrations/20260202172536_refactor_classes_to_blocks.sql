-- Refactor classes to use Block-based scheduling
ALTER TABLE public.classes ADD COLUMN day TEXT;
ALTER TABLE public.classes ADD COLUMN block TEXT;

-- Refactor calendar_events to use Date + Block
ALTER TABLE public.calendar_events ADD COLUMN date DATE;
ALTER TABLE public.calendar_events ADD COLUMN block TEXT;

-- Drop time columns from calendar_events
ALTER TABLE public.calendar_events DROP COLUMN start_time;
ALTER TABLE public.calendar_events DROP COLUMN end_time;

-- indexes for performance
CREATE INDEX idx_classes_day_block ON public.classes(day, block);
CREATE INDEX idx_calendar_events_date_block ON public.calendar_events(date, block);;
