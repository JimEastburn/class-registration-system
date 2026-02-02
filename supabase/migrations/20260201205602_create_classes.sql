CREATE TYPE public."ClassStatus" AS ENUM ('draft', 'published', 'completed', 'cancelled');

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  location TEXT,
  schedule_config JSONB, -- Stores repeated schedule rules
  status public."ClassStatus" NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.classes IS 'Classes offered by teachers';
