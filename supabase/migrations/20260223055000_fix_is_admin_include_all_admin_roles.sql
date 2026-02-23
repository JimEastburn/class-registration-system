-- Fix is_admin() to include super_admin and class_scheduler roles.
-- Previously only checked role = 'admin', which caused RLS to block
-- class_scheduler and super_admin users from reading enrollments, classes, etc.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin', 'class_scheduler')
  );
$function$;
