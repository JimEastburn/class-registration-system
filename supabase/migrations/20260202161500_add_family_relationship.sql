ALTER TABLE public.family_members ADD COLUMN relationship TEXT NOT NULL DEFAULT 'Student';

COMMENT ON COLUMN public.family_members.relationship IS 'Relationship to the parent (e.g., Student, Parent/Guardian)';

-- Optional: Add a check constraint to ensure valid values if we want stricter enforcement at DB level
-- ALTER TABLE public.family_members ADD CONSTRAINT check_relationship CHECK (relationship IN ('Student', 'Parent/Guardian'));
