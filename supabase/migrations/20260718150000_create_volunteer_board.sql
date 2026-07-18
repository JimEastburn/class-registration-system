-- Volunteer slot configuration and signup board.
-- Additive migration: creates a global board with configurable roles, blocks,
-- enabled role/block slots, and self-service signups.

CREATE OR REPLACE FUNCTION public.is_volunteer_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$function$;

CREATE TABLE public.volunteer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_roles_name_trimmed CHECK (name = btrim(name) AND length(name) > 0)
);

ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX volunteer_roles_name_lower_key
ON public.volunteer_roles (lower(name));

CREATE INDEX volunteer_roles_sort_order_idx
ON public.volunteer_roles (sort_order);

CREATE TABLE public.volunteer_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_blocks_name_trimmed CHECK (name = btrim(name) AND length(name) > 0)
);

ALTER TABLE public.volunteer_blocks ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX volunteer_blocks_name_lower_key
ON public.volunteer_blocks (lower(name));

CREATE INDEX volunteer_blocks_sort_order_idx
ON public.volunteer_blocks (sort_order);

CREATE TABLE public.volunteer_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.volunteer_blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, block_id),
  UNIQUE (id, block_id)
);

ALTER TABLE public.volunteer_slots ENABLE ROW LEVEL SECURITY;

CREATE INDEX volunteer_slots_role_id_idx
ON public.volunteer_slots (role_id);

CREATE INDEX volunteer_slots_block_id_idx
ON public.volunteer_slots (block_id);

CREATE TABLE public.volunteer_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL,
  block_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_signups_slot_block_fkey
    FOREIGN KEY (slot_id, block_id)
    REFERENCES public.volunteer_slots(id, block_id)
    ON DELETE RESTRICT,
  CONSTRAINT volunteer_signups_display_name_present CHECK (length(btrim(display_name)) > 0),
  UNIQUE (slot_id),
  UNIQUE (user_id, block_id)
);

ALTER TABLE public.volunteer_signups ENABLE ROW LEVEL SECURITY;

CREATE INDEX volunteer_signups_user_id_idx
ON public.volunteer_signups (user_id);

CREATE INDEX volunteer_signups_block_id_idx
ON public.volunteer_signups (block_id);

CREATE TRIGGER set_volunteer_roles_updated_at
BEFORE UPDATE ON public.volunteer_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_volunteer_blocks_updated_at
BEFORE UPDATE ON public.volunteer_blocks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.prepare_volunteer_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_block_id UUID;
  volunteer_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING HINT = 'VOLUNTEER_AUTH_REQUIRED';
  END IF;

  SELECT block_id
  INTO slot_block_id
  FROM public.volunteer_slots
  WHERE id = NEW.slot_id;

  IF slot_block_id IS NULL THEN
    RAISE EXCEPTION 'Volunteer slot not found'
      USING HINT = 'VOLUNTEER_SLOT_NOT_FOUND';
  END IF;

  SELECT btrim(concat_ws(' ', nullif(first_name, ''), nullif(last_name, '')))
  INTO volunteer_name
  FROM public.profiles
  WHERE id = auth.uid();

  IF volunteer_name IS NULL OR volunteer_name = '' THEN
    RAISE EXCEPTION 'Your profile needs a first or last name before volunteering'
      USING HINT = 'VOLUNTEER_NAME_REQUIRED';
  END IF;

  NEW.user_id := auth.uid();
  NEW.block_id := slot_block_id;
  NEW.display_name := volunteer_name;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER prepare_volunteer_signup_before_insert
BEFORE INSERT ON public.volunteer_signups
FOR EACH ROW
EXECUTE FUNCTION public.prepare_volunteer_signup();

CREATE OR REPLACE FUNCTION public.sync_volunteer_signup_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  volunteer_name TEXT;
BEGIN
  IF OLD.first_name IS NOT DISTINCT FROM NEW.first_name
     AND OLD.last_name IS NOT DISTINCT FROM NEW.last_name THEN
    RETURN NEW;
  END IF;

  volunteer_name := btrim(concat_ws(' ', nullif(NEW.first_name, ''), nullif(NEW.last_name, '')));

  IF volunteer_name <> '' THEN
    UPDATE public.volunteer_signups
    SET display_name = volunteer_name
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_volunteer_signup_display_name_after_profile_update
AFTER UPDATE OF first_name, last_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_volunteer_signup_display_name();

CREATE OR REPLACE FUNCTION public.audit_volunteer_config_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target UUID;
  details JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target := OLD.id;
    details := to_jsonb(OLD);
  ELSE
    target := NEW.id;
    details := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    lower(TG_OP) || '_volunteer_' || replace(TG_TABLE_NAME, 'volunteer_', ''),
    TG_TABLE_NAME,
    target,
    details
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_volunteer_role(
  p_role_id UUID,
  p_direction TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_order INTEGER;
  adjacent_id UUID;
  adjacent_order INTEGER;
BEGIN
  IF NOT public.is_volunteer_admin() THEN
    RAISE EXCEPTION 'Unauthorized'
      USING HINT = 'VOLUNTEER_ADMIN_REQUIRED';
  END IF;

  IF p_direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid move direction'
      USING HINT = 'VOLUNTEER_INVALID_DIRECTION';
  END IF;

  LOCK TABLE public.volunteer_roles IN ROW EXCLUSIVE MODE;

  SELECT sort_order INTO current_order
  FROM public.volunteer_roles
  WHERE id = p_role_id;

  IF current_order IS NULL THEN
    RAISE EXCEPTION 'Volunteer role not found'
      USING HINT = 'VOLUNTEER_ROLE_NOT_FOUND';
  END IF;

  IF p_direction = 'up' THEN
    SELECT id, sort_order INTO adjacent_id, adjacent_order
    FROM public.volunteer_roles
    WHERE sort_order < current_order
    ORDER BY sort_order DESC
    LIMIT 1;
  ELSE
    SELECT id, sort_order INTO adjacent_id, adjacent_order
    FROM public.volunteer_roles
    WHERE sort_order > current_order
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF adjacent_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.volunteer_roles
  SET sort_order = adjacent_order
  WHERE id = p_role_id;

  UPDATE public.volunteer_roles
  SET sort_order = current_order
  WHERE id = adjacent_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_volunteer_block(
  p_block_id UUID,
  p_direction TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_order INTEGER;
  adjacent_id UUID;
  adjacent_order INTEGER;
BEGIN
  IF NOT public.is_volunteer_admin() THEN
    RAISE EXCEPTION 'Unauthorized'
      USING HINT = 'VOLUNTEER_ADMIN_REQUIRED';
  END IF;

  IF p_direction NOT IN ('up', 'down') THEN
    RAISE EXCEPTION 'Invalid move direction'
      USING HINT = 'VOLUNTEER_INVALID_DIRECTION';
  END IF;

  LOCK TABLE public.volunteer_blocks IN ROW EXCLUSIVE MODE;

  SELECT sort_order INTO current_order
  FROM public.volunteer_blocks
  WHERE id = p_block_id;

  IF current_order IS NULL THEN
    RAISE EXCEPTION 'Volunteer block not found'
      USING HINT = 'VOLUNTEER_BLOCK_NOT_FOUND';
  END IF;

  IF p_direction = 'up' THEN
    SELECT id, sort_order INTO adjacent_id, adjacent_order
    FROM public.volunteer_blocks
    WHERE sort_order < current_order
    ORDER BY sort_order DESC
    LIMIT 1;
  ELSE
    SELECT id, sort_order INTO adjacent_id, adjacent_order
    FROM public.volunteer_blocks
    WHERE sort_order > current_order
    ORDER BY sort_order ASC
    LIMIT 1;
  END IF;

  IF adjacent_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.volunteer_blocks
  SET sort_order = adjacent_order
  WHERE id = p_block_id;

  UPDATE public.volunteer_blocks
  SET sort_order = current_order
  WHERE id = adjacent_id;
END;
$function$;

CREATE POLICY "Authenticated users can read volunteer roles"
ON public.volunteer_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Volunteer admins can insert volunteer roles"
ON public.volunteer_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_volunteer_admin());

CREATE POLICY "Volunteer admins can update volunteer roles"
ON public.volunteer_roles FOR UPDATE
TO authenticated
USING (public.is_volunteer_admin())
WITH CHECK (public.is_volunteer_admin());

CREATE POLICY "Volunteer admins can delete volunteer roles"
ON public.volunteer_roles FOR DELETE
TO authenticated
USING (public.is_volunteer_admin());

CREATE POLICY "Authenticated users can read volunteer blocks"
ON public.volunteer_blocks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Volunteer admins can insert volunteer blocks"
ON public.volunteer_blocks FOR INSERT
TO authenticated
WITH CHECK (public.is_volunteer_admin());

CREATE POLICY "Volunteer admins can update volunteer blocks"
ON public.volunteer_blocks FOR UPDATE
TO authenticated
USING (public.is_volunteer_admin())
WITH CHECK (public.is_volunteer_admin());

CREATE POLICY "Volunteer admins can delete volunteer blocks"
ON public.volunteer_blocks FOR DELETE
TO authenticated
USING (public.is_volunteer_admin());

CREATE POLICY "Authenticated users can read volunteer slots"
ON public.volunteer_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Volunteer admins can insert volunteer slots"
ON public.volunteer_slots FOR INSERT
TO authenticated
WITH CHECK (public.is_volunteer_admin());

CREATE POLICY "Volunteer admins can delete volunteer slots"
ON public.volunteer_slots FOR DELETE
TO authenticated
USING (public.is_volunteer_admin());

CREATE POLICY "Authenticated users can read volunteer signups"
ON public.volunteer_signups FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own volunteer signups"
ON public.volunteer_signups FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own volunteer signups"
ON public.volunteer_signups FOR DELETE
TO authenticated
USING (user_id = auth.uid());

INSERT INTO public.volunteer_roles (name, sort_order)
VALUES
  ('Door Monitor Narthex', 1),
  ('Door Monitor Gym', 2),
  ('Downstairs Main Building Monitor', 3),
  ('Park Monitor', 4),
  ('Crossing Guard', 5),
  ('Murchison Field Supervisor', 6),
  ('Set out and pick up green space signs', 7),
  ('Set out signs', 8),
  ('Put away signs', 9),
  ('Take out trash, recycling', 10),
  ('Fold up tables and chairs', 11),
  ('Sweep', 12),
  ('Check bathrooms, restock - YC and MB', 13),
  ('Lost and Found, First Aid Upkeep', 14),
  ('Library Upkeep', 15);

INSERT INTO public.volunteer_blocks (name, sort_order)
VALUES
  ('Tuesday Block 1', 1),
  ('Tuesday Block 2', 2),
  ('Tuesday lunch', 3),
  ('Tuesday Block 3', 4),
  ('Tuesday Block 4', 5),
  ('Tuesday after Block 4', 6),
  ('Wednesday Block 1', 7),
  ('Wednesday Block 2', 8),
  ('Wednesday lunch', 9),
  ('Wednesday Block 3', 10),
  ('Wednesday after Block 3', 11),
  ('Thursday Block 1', 12),
  ('Thursday Block 2', 13),
  ('Thursday lunch', 14),
  ('Thursday Block 3', 15),
  ('Thursday Block 4', 16),
  ('Thursday after Block 4', 17),
  ('Once per week', 18),
  ('Tuesday - once', 19),
  ('Wednesday - once', 20),
  ('Thursday - once', 21);

CREATE TRIGGER audit_volunteer_roles_change
AFTER INSERT OR UPDATE OR DELETE ON public.volunteer_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_volunteer_config_change();

CREATE TRIGGER audit_volunteer_blocks_change
AFTER INSERT OR UPDATE OR DELETE ON public.volunteer_blocks
FOR EACH ROW
EXECUTE FUNCTION public.audit_volunteer_config_change();

CREATE TRIGGER audit_volunteer_slots_change
AFTER INSERT OR DELETE ON public.volunteer_slots
FOR EACH ROW
EXECUTE FUNCTION public.audit_volunteer_config_change();
