CREATE TABLE public.class_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.class_materials IS 'Educational materials uploaded for a class';
