-- Optional plain-text descriptions for volunteer roles.
-- Existing roles intentionally remain NULL until an administrator adds copy.

ALTER TABLE public.volunteer_roles
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.volunteer_roles
DROP CONSTRAINT IF EXISTS volunteer_roles_description_length;

ALTER TABLE public.volunteer_roles
ADD CONSTRAINT volunteer_roles_description_length
CHECK (description IS NULL OR char_length(description) <= 1000);

COMMENT ON COLUMN public.volunteer_roles.description IS
  'Optional plain-text role description shown to volunteers; maximum 1,000 characters';
