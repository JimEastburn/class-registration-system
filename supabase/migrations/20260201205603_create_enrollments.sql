CREATE TYPE public."EnrollmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'waitlisted');

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status public."EnrollmentStatus" NOT NULL DEFAULT 'pending',
  waitlist_position INTEGER, -- Null if not on waitlist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, class_id) -- Prevent duplicate enrollments
);

COMMENT ON TABLE public.enrollments IS 'Student enrollments in classes';
