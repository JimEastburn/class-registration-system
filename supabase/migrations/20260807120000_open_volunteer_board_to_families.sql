-- End the staff pilot: parents and students can now use the volunteer board.
--
-- Replaces `is_volunteer_tester()` (teacher/admin/super_admin only, added in
-- 20260718210000_limit_volunteers_to_staff_pilot.sql) with
-- `can_use_volunteer_board()`. Class schedulers remain excluded; they reach the
-- board through the additive `is_volunteer_admin` flag if they need it.
--
-- Admin/super-admin configuration access is unchanged and still runs through
-- `is_volunteer_admin()`.

CREATE OR REPLACE FUNCTION public.can_use_volunteer_board()
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
        profile.role IN ('parent', 'student', 'teacher', 'admin', 'super_admin')
        OR profile.is_volunteer_admin = TRUE
      )
  );
$function$;

COMMENT ON FUNCTION public.can_use_volunteer_board() IS
  'True when the current user may view the volunteer board and manage their own signups';

DROP POLICY IF EXISTS "Volunteer testers can read volunteer roles"
ON public.volunteer_roles;

DROP POLICY IF EXISTS "Volunteer testers can read volunteer blocks"
ON public.volunteer_blocks;

DROP POLICY IF EXISTS "Volunteer testers can read volunteer slots"
ON public.volunteer_slots;

DROP POLICY IF EXISTS "Volunteer testers can read volunteer signups"
ON public.volunteer_signups;

DROP POLICY IF EXISTS "Volunteer testers can insert their own volunteer signups"
ON public.volunteer_signups;

DROP POLICY IF EXISTS "Volunteer testers can delete their own volunteer signups"
ON public.volunteer_signups;

CREATE POLICY "Board users can read volunteer roles"
ON public.volunteer_roles FOR SELECT
TO authenticated
USING (public.can_use_volunteer_board());

CREATE POLICY "Board users can read volunteer blocks"
ON public.volunteer_blocks FOR SELECT
TO authenticated
USING (public.can_use_volunteer_board());

CREATE POLICY "Board users can read volunteer slots"
ON public.volunteer_slots FOR SELECT
TO authenticated
USING (public.can_use_volunteer_board());

-- Everyone on the board sees who has claimed what; only your own row is yours
-- to create or remove.
CREATE POLICY "Board users can read volunteer signups"
ON public.volunteer_signups FOR SELECT
TO authenticated
USING (public.can_use_volunteer_board());

CREATE POLICY "Board users can insert their own volunteer signups"
ON public.volunteer_signups FOR INSERT
TO authenticated
WITH CHECK (
  public.can_use_volunteer_board()
  AND user_id = auth.uid()
);

CREATE POLICY "Board users can delete their own volunteer signups"
ON public.volunteer_signups FOR DELETE
TO authenticated
USING (
  public.can_use_volunteer_board()
  AND user_id = auth.uid()
);

DROP FUNCTION IF EXISTS public.is_volunteer_tester();
