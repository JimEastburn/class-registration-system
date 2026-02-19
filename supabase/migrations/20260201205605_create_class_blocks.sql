-- Create class_blocks table (teacher blocks a student from a class)
CREATE TABLE public.class_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Handle new block: cancel enrollment
CREATE OR REPLACE FUNCTION public.handle_new_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.enrollments
    SET status = 'cancelled'
    WHERE class_id = NEW.class_id
    AND student_id = NEW.student_id;

    RETURN NEW;
END;
$function$;
