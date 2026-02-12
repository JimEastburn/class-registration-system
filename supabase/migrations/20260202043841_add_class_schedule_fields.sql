-- Add individual schedule fields to classes table
-- These fields complement the schedule_config JSONB for easier querying

-- Rename title to name for consistency with codebase
ALTER TABLE public.classes RENAME COLUMN title TO name;

-- Add individual schedule fields
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS day_of_week TEXT DEFAULT 'TBA';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT 'TBA';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_time TEXT DEFAULT 'TBA';
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS age_min INTEGER;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS age_max INTEGER;

-- Add index for common queries
CREATE INDEX IF NOT EXISTS idx_classes_day_of_week ON public.classes(day_of_week);
CREATE INDEX IF NOT EXISTS idx_classes_status_start_date ON public.classes(status, start_date);

COMMENT ON COLUMN public.classes.day_of_week IS 'Day class meets: Monday-Sunday or TBA';
COMMENT ON COLUMN public.classes.start_time IS 'Start time in HH:MM format or TBA';
COMMENT ON COLUMN public.classes.end_time IS 'End time in HH:MM format or TBA';;
