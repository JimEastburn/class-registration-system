-- Create classes table
-- NOTE: column is "title" here; renamed to "name" in migration 14
-- NOTE: "day" and "block" columns are added by migration 15 (refactor_classes_to_blocks)
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  price NUMERIC NOT NULL DEFAULT 0.00,
  location TEXT,
  schedule_config JSONB,
  status "ClassStatus" NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
