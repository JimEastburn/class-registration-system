-- Temporarily limit volunteer board access to staff testers while the feature
-- is piloted. Admin/super-admin configuration access remains unchanged.

CREATE OR REPLACE FUNCTION public.is_volunteer_tester()
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
      AND role IN ('teacher', 'admin', 'super_admin')
  );
$function$;

DROP POLICY IF EXISTS "Authenticated users can read volunteer roles"
ON public.volunteer_roles;

DROP POLICY IF EXISTS "Authenticated users can read volunteer blocks"
ON public.volunteer_blocks;

DROP POLICY IF EXISTS "Authenticated users can read volunteer slots"
ON public.volunteer_slots;

DROP POLICY IF EXISTS "Authenticated users can read volunteer signups"
ON public.volunteer_signups;

DROP POLICY IF EXISTS "Users can insert their own volunteer signups"
ON public.volunteer_signups;

DROP POLICY IF EXISTS "Users can delete their own volunteer signups"
ON public.volunteer_signups;

CREATE POLICY "Volunteer testers can read volunteer roles"
ON public.volunteer_roles FOR SELECT
TO authenticated
USING (public.is_volunteer_tester());

CREATE POLICY "Volunteer testers can read volunteer blocks"
ON public.volunteer_blocks FOR SELECT
TO authenticated
USING (public.is_volunteer_tester());

CREATE POLICY "Volunteer testers can read volunteer slots"
ON public.volunteer_slots FOR SELECT
TO authenticated
USING (public.is_volunteer_tester());

CREATE POLICY "Volunteer testers can read volunteer signups"
ON public.volunteer_signups FOR SELECT
TO authenticated
USING (public.is_volunteer_tester());

CREATE POLICY "Volunteer testers can insert their own volunteer signups"
ON public.volunteer_signups FOR INSERT
TO authenticated
WITH CHECK (
  public.is_volunteer_tester()
  AND user_id = auth.uid()
);

CREATE POLICY "Volunteer testers can delete their own volunteer signups"
ON public.volunteer_signups FOR DELETE
TO authenticated
USING (
  public.is_volunteer_tester()
  AND user_id = auth.uid()
);
