-- Make first_name and last_name NOT NULL on profiles table.
-- The auth trigger already uses COALESCE to default to '', so no existing rows have nulls.

ALTER TABLE public.profiles
  ALTER COLUMN first_name SET DEFAULT '',
  ALTER COLUMN first_name SET NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN last_name SET DEFAULT '',
  ALTER COLUMN last_name SET NOT NULL;
