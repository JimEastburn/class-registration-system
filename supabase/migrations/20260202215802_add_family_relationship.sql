ALTER TABLE public.family_members ADD COLUMN relationship TEXT NOT NULL DEFAULT 'Student';

COMMENT ON COLUMN public.family_members.relationship IS 'Relationship to the parent (e.g., Student, Parent/Guardian)';
;
