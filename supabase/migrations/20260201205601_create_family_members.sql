CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable link to a real user account
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade TEXT,
  dob DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.family_members IS 'Family members (students) linked to a parent';
COMMENT ON COLUMN public.family_members.student_user_id IS 'Optional link to a registered student user account';
