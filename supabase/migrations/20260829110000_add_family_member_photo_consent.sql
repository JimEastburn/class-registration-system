-- Parents can grant or revoke photo consent independently for each student.
-- Existing and newly created records default to no consent.
ALTER TABLE public.family_members
ADD COLUMN photo_consent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.family_members.photo_consent IS
  'Whether the parent consents to photographs of this student appearing on AAC social media and in other marketing materials';

-- The student self-link UPDATE policy permits a linked student to update their
-- family_members row. Consent belongs to the parent, so protect this specific
-- column from changes by linked students or other non-parent actors. Existing
-- admin and service-role access remains available for support operations.
CREATE OR REPLACE FUNCTION public.protect_family_member_photo_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.photo_consent IS DISTINCT FROM OLD.photo_consent
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND auth.uid() IS DISTINCT FROM OLD.parent_id
    AND NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'Only a parent can change photo consent for their student'
      USING ERRCODE = '42501', HINT = 'PHOTO_CONSENT_PARENT_REQUIRED';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER protect_family_member_photo_consent_before_update
BEFORE UPDATE OF photo_consent ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.protect_family_member_photo_consent();
