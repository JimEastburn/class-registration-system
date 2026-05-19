-- Add helper function for admin class search across all visible fields
-- This enables partial matching on numeric columns (capacity, age_min, age_max, current_enrollment)
-- which cannot be done directly via PostgREST .or() because type casts (capacity::text) are
-- not supported inside the .or() logic-tree parser.
--
-- TODO: If the classes dataset grows past low thousands of rows, replace the 13-column
-- ILIKE scan with pg_trgm GIN indexes on the high-cardinality text columns
-- (name, description, location) and use the % operator instead.
CREATE OR REPLACE FUNCTION public.search_class_ids(search_term TEXT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id
  FROM classes c
  LEFT JOIN profiles t ON t.id = c.teacher_id
  WHERE
    c.name ILIKE '%' || search_term || '%'
    OR c.description ILIKE '%' || search_term || '%'
    OR c.status::text ILIKE '%' || search_term || '%'
    OR c.location ILIKE '%' || search_term || '%'
    OR c.day_of_week ILIKE '%' || search_term || '%'
    OR c.day ILIKE '%' || search_term || '%'
    OR c.block ILIKE '%' || search_term || '%'
    OR c.capacity::text ILIKE '%' || search_term || '%'
    OR c.age_min::text ILIKE '%' || search_term || '%'
    OR c.age_max::text ILIKE '%' || search_term || '%'
    OR c.current_enrollment::text ILIKE '%' || search_term || '%'
    OR t.first_name ILIKE '%' || search_term || '%'
    OR t.last_name ILIKE '%' || search_term || '%';
END;
$$;

-- Restrict callers: only the service role (used by the admin Supabase client in
-- getAllClasses) should be able to invoke this. The server action enforces role
-- checks at the application layer before calling the RPC.
REVOKE EXECUTE ON FUNCTION public.search_class_ids(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_class_ids(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_class_ids(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.search_class_ids(text) TO service_role;
