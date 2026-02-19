-- Add family relationship (duplicate-safe version)
-- This is a duplicate of 20260202161500_add_family_relationship.sql
ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS relationship TEXT NOT NULL DEFAULT 'Student';

COMMENT ON COLUMN public.family_members.relationship IS 'Relationship to the parent (e.g., Student, Parent/Guardian)';
