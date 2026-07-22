-- Add volunteer administration as an additive profile permission.
-- Volunteer admins retain their primary role and receive access only to the
-- volunteer board and volunteer configuration features.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_volunteer_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_volunteer_admin IS
  'Additive permission to manage volunteer configuration and signups without changing the primary role';

-- Prevent authenticated users from changing authorization fields through the
-- existing own-profile UPDATE policy. Protecting the primary role here also
-- closes the path where a user could first promote themselves to admin and
-- then grant the new flag. Admin/super-admin actors may change these fields;
-- service-role calls are already trusted.
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
BEFORE UPDATE OF role, is_volunteer_admin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_authorization_fields();

-- Existing admins keep their volunteer access. The new flag adds the same
-- narrowly-scoped access to users with any other primary role.
CREATE OR REPLACE FUNCTION public.is_volunteer_admin()
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
        OR profile.is_volunteer_admin = TRUE
      )
  );
$function$;

-- Volunteer administrators also need the regular board access that teachers
-- and existing admins receive during the staff pilot.
CREATE OR REPLACE FUNCTION public.is_volunteer_tester()
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
        profile.role IN ('teacher', 'admin', 'super_admin')
        OR profile.is_volunteer_admin = TRUE
      )
  );
$function$;

-- Record moves as a removal from the old slot and a claim of the new slot.
-- This keeps the existing two-action activity-log vocabulary intact.
CREATE OR REPLACE FUNCTION public.log_volunteer_signup_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
  SELECT
    'removal',
    OLD.id,
    OLD.slot_id,
    OLD.user_id,
    OLD.display_name,
    slot.role_id,
    role.name,
    slot.block_id,
    block.name
  FROM public.volunteer_slots AS slot
  JOIN public.volunteer_roles AS role ON role.id = slot.role_id
  JOIN public.volunteer_blocks AS block ON block.id = slot.block_id
  WHERE slot.id = OLD.slot_id;

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
  SELECT
    'claim',
    NEW.id,
    NEW.slot_id,
    NEW.user_id,
    NEW.display_name,
    slot.role_id,
    role.name,
    slot.block_id,
    block.name
  FROM public.volunteer_slots AS slot
  JOIN public.volunteer_roles AS role ON role.id = slot.role_id
  JOIN public.volunteer_blocks AS block ON block.id = slot.block_id
  WHERE slot.id = NEW.slot_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS log_volunteer_signup_move_after_update
ON public.volunteer_signups;

CREATE TRIGGER log_volunteer_signup_move_after_update
AFTER UPDATE OF slot_id ON public.volunteer_signups
FOR EACH ROW
WHEN (OLD.slot_id IS DISTINCT FROM NEW.slot_id)
EXECUTE FUNCTION public.log_volunteer_signup_move();

-- Move a signup atomically while preserving its user, display name, identity,
-- and original creation time. The normal INSERT preparation trigger is
-- intentionally avoided because it represents a self-service claim.
CREATE OR REPLACE FUNCTION public.move_volunteer_signup(
  p_signup_id UUID,
  p_slot_id UUID
)
RETURNS public.volunteer_signups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  signup_row public.volunteer_signups%ROWTYPE;
  target_slot public.volunteer_slots%ROWTYPE;
  moved_row public.volunteer_signups%ROWTYPE;
BEGIN
  IF NOT public.is_volunteer_admin() THEN
    RAISE EXCEPTION 'Volunteer administrator access is required'
      USING ERRCODE = '42501', HINT = 'VOLUNTEER_ADMIN_REQUIRED';
  END IF;

  SELECT *
  INTO signup_row
  FROM public.volunteer_signups
  WHERE id = p_signup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Volunteer signup not found'
      USING ERRCODE = 'P0002', HINT = 'VOLUNTEER_SIGNUP_NOT_FOUND';
  END IF;

  SELECT *
  INTO target_slot
  FROM public.volunteer_slots
  WHERE id = p_slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Volunteer slot not found'
      USING ERRCODE = 'P0002', HINT = 'VOLUNTEER_SLOT_NOT_FOUND';
  END IF;

  IF signup_row.slot_id = target_slot.id THEN
    RETURN signup_row;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.volunteer_signups
    WHERE slot_id = target_slot.id
      AND id <> signup_row.id
  ) THEN
    RAISE EXCEPTION 'Volunteer slot is already occupied'
      USING ERRCODE = '23505', HINT = 'VOLUNTEER_SLOT_OCCUPIED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.volunteer_signups
    WHERE user_id = signup_row.user_id
      AND block_id = target_slot.block_id
      AND id <> signup_row.id
  ) THEN
    RAISE EXCEPTION 'Volunteer already has a signup during this block'
      USING ERRCODE = '23505', HINT = 'VOLUNTEER_BLOCK_CONFLICT';
  END IF;

  UPDATE public.volunteer_signups
  SET
    slot_id = target_slot.id,
    block_id = target_slot.block_id
  WHERE id = signup_row.id
  RETURNING * INTO moved_row;

  RETURN moved_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_volunteer_signup_as_admin(
  p_signup_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_volunteer_admin() THEN
    RAISE EXCEPTION 'Volunteer administrator access is required'
      USING ERRCODE = '42501', HINT = 'VOLUNTEER_ADMIN_REQUIRED';
  END IF;

  DELETE FROM public.volunteer_signups
  WHERE id = p_signup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Volunteer signup not found'
      USING ERRCODE = 'P0002', HINT = 'VOLUNTEER_SIGNUP_NOT_FOUND';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.move_volunteer_signup(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_volunteer_signup(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_volunteer_signup_as_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_volunteer_signup_as_admin(UUID) TO authenticated;
