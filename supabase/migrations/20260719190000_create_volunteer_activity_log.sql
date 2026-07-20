-- Append-only activity log for volunteer board claim/remove actions.
-- This preserves removals after the volunteer_signups row is deleted.

CREATE TABLE public.volunteer_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('claim', 'removal')),
  signup_id UUID NOT NULL,
  slot_id UUID NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role_id UUID,
  role_name TEXT NOT NULL,
  block_id UUID,
  block_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX volunteer_activity_log_created_at_idx
ON public.volunteer_activity_log (created_at DESC);

CREATE INDEX volunteer_activity_log_user_id_idx
ON public.volunteer_activity_log (user_id);

CREATE POLICY "Volunteer admins can read volunteer activity log"
ON public.volunteer_activity_log FOR SELECT
TO authenticated
USING (public.is_volunteer_admin());

CREATE OR REPLACE FUNCTION public.log_volunteer_signup_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  source_row public.volunteer_signups%ROWTYPE;
  slot_role_id UUID;
  slot_block_id UUID;
  resolved_role_name TEXT;
  resolved_block_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    source_row := NEW;
  ELSIF TG_OP = 'DELETE' THEN
    source_row := OLD;
  ELSE
    RETURN NULL;
  END IF;

  SELECT
    s.role_id,
    s.block_id,
    r.name,
    b.name
  INTO
    slot_role_id,
    slot_block_id,
    resolved_role_name,
    resolved_block_name
  FROM public.volunteer_slots s
  JOIN public.volunteer_roles r ON r.id = s.role_id
  JOIN public.volunteer_blocks b ON b.id = s.block_id
  WHERE s.id = source_row.slot_id;

  INSERT INTO public.volunteer_activity_log (
    action,
    signup_id,
    slot_id,
    user_id,
    display_name,
    role_id,
    role_name,
    block_id,
    block_name
  )
  VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'claim' ELSE 'removal' END,
    source_row.id,
    source_row.slot_id,
    source_row.user_id,
    source_row.display_name,
    slot_role_id,
    COALESCE(resolved_role_name, 'Unknown role'),
    COALESCE(slot_block_id, source_row.block_id),
    COALESCE(resolved_block_name, 'Unknown block')
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER log_volunteer_signup_activity_after_insert
AFTER INSERT ON public.volunteer_signups
FOR EACH ROW
EXECUTE FUNCTION public.log_volunteer_signup_activity();

CREATE TRIGGER log_volunteer_signup_activity_after_delete
AFTER DELETE ON public.volunteer_signups
FOR EACH ROW
EXECUTE FUNCTION public.log_volunteer_signup_activity();
