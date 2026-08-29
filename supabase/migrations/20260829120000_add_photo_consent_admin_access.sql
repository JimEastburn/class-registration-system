-- Additive access to the photo-consent administration page. This does not
-- change a user's primary role or grant access to the rest of the admin portal.
ALTER TABLE public.profiles
ADD COLUMN is_photo_consent_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_photo_consent_admin IS
  'Additive permission to view the photo-consent administration page without changing the primary role';

-- Extend the existing authorization-field guard so users cannot grant this
-- permission to themselves through the own-profile UPDATE policy.
CREATE OR REPLACE FUNCTION public.protect_profile_authorization_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (
      NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_volunteer_admin IS DISTINCT FROM OLD.is_volunteer_admin
      OR NEW.is_photo_consent_admin IS DISTINCT FROM OLD.is_photo_consent_admin
    )
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles AS actor
      WHERE actor.id = auth.uid()
        AND actor.role IN ('admin', 'super_admin')
    )
  THEN
    RAISE EXCEPTION 'Only admins can change profile authorization fields'
      USING ERRCODE = '42501', HINT = 'PROFILE_AUTHORIZATION_REQUIRED';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_profile_authorization_fields_before_update
ON public.profiles;

CREATE TRIGGER protect_profile_authorization_fields_before_update
BEFORE UPDATE OF role, is_volunteer_admin, is_photo_consent_admin
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_authorization_fields();

CREATE OR REPLACE FUNCTION public.is_photo_consent_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND (
        profile.role IN ('admin', 'super_admin')
        OR profile.is_photo_consent_admin = TRUE
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.is_photo_consent_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_photo_consent_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_photo_consent_admin() TO service_role;
