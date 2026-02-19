-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'UPDATE_ROLE', 'profile', NEW.id, jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
  END IF;
  RETURN NEW;
END;
$function$;
