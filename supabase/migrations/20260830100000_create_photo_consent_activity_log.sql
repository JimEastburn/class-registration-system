-- Append-only history of photo consent grants and removals. Names are
-- snapshotted so the record remains useful after a profile is renamed/deleted.

CREATE TABLE public.photo_consent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('consent', 'removed_consent')),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL,
  student_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_consent_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX photo_consent_activity_log_created_at_idx
ON public.photo_consent_activity_log (created_at DESC);

CREATE INDEX photo_consent_activity_log_parent_id_idx
ON public.photo_consent_activity_log (parent_id);

CREATE INDEX photo_consent_activity_log_student_id_idx
ON public.photo_consent_activity_log (student_id);

CREATE POLICY "Photo consent admins can read photo consent activity log"
ON public.photo_consent_activity_log FOR SELECT
TO authenticated
USING (public.is_photo_consent_admin());

CREATE FUNCTION public.log_photo_consent_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resolved_parent_name TEXT;
  resolved_student_name TEXT;
BEGIN
  SELECT NULLIF(
    BTRIM(CONCAT_WS(' ', profile.first_name, profile.last_name)),
    ''
  )
  INTO resolved_parent_name
  FROM public.profiles AS profile
  WHERE profile.id = NEW.parent_id;

  resolved_student_name := NULLIF(
    BTRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)),
    ''
  );

  INSERT INTO public.photo_consent_activity_log (
    action,
    parent_id,
    student_id,
    parent_name,
    student_name
  )
  VALUES (
    CASE WHEN NEW.photo_consent THEN 'consent' ELSE 'removed_consent' END,
    NEW.parent_id,
    NEW.id,
    COALESCE(resolved_parent_name, 'Unknown parent'),
    COALESCE(resolved_student_name, 'Unknown student')
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER log_photo_consent_activity_after_update
AFTER UPDATE OF photo_consent ON public.family_members
FOR EACH ROW
WHEN (OLD.photo_consent IS DISTINCT FROM NEW.photo_consent)
EXECUTE FUNCTION public.log_photo_consent_activity();

-- Preserve the photo consent changes recorded before this dedicated log was
-- introduced when the current parent and student records can still be found.
INSERT INTO public.photo_consent_activity_log (
  action,
  parent_id,
  student_id,
  parent_name,
  student_name,
  created_at
)
SELECT
  CASE
    WHEN audit.details ->> 'photo_consent' = 'true' THEN 'consent'
    ELSE 'removed_consent'
  END,
  student.parent_id,
  student.id,
  COALESCE(
    NULLIF(BTRIM(CONCAT_WS(' ', parent.first_name, parent.last_name)), ''),
    'Unknown parent'
  ),
  COALESCE(
    NULLIF(BTRIM(CONCAT_WS(' ', student.first_name, student.last_name)), ''),
    'Unknown student'
  ),
  audit.created_at
FROM public.audit_logs AS audit
JOIN public.family_members AS student ON student.id = audit.target_id
LEFT JOIN public.profiles AS parent ON parent.id = student.parent_id
WHERE audit.action = 'family_member.photo_consent_updated'
  AND audit.details ? 'photo_consent'
  AND audit.details ? 'previous_photo_consent'
  AND (audit.details ->> 'previous_photo_consent')
    IS DISTINCT FROM (audit.details ->> 'photo_consent');
