ALTER TABLE public.profiles ADD COLUMN is_parent BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN public.profiles.is_parent IS 'Flag to indicate if a user with another role is also a parent';
UPDATE public.profiles SET is_parent = TRUE WHERE role = 'parent';;
