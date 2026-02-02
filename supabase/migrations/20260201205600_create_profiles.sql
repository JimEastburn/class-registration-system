-- Create UserRole enum
CREATE TYPE public."UserRole" AS ENUM ('parent', 'teacher', 'student', 'admin', 'class_scheduler', 'super_admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role public."UserRole" NOT NULL DEFAULT 'parent',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  specializations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  code_of_conduct_agreed_at TIMESTAMPTZ
);

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users';
COMMENT ON COLUMN public.profiles.role IS 'User role for RBAC';
