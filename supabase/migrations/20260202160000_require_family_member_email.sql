ALTER TABLE public.family_members ADD COLUMN email TEXT NOT NULL;

COMMENT ON COLUMN public.family_members.email IS 'Email address of the family member (required)';
