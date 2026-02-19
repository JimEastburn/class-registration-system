-- Create calendar_events table
-- NOTE: start_time and end_time are dropped in migration 15 (refactor_classes_to_blocks)
-- NOTE: date and block columns are added in migration 15
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
