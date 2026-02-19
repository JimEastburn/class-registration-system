-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status "EnrollmentStatus" NOT NULL DEFAULT 'pending',
  waitlist_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, class_id)
);

-- Helper: check if current user teaches a given student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(check_student_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = check_student_id
    AND c.teacher_id = auth.uid()
  );
$function$;

-- Log enrollment changes
CREATE OR REPLACE FUNCTION public.log_enrollment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, target_type, target_id, details)
    VALUES (auth.uid(), 'UPDATE_ENROLLMENT_STATUS', 'enrollment', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$function$;

-- Update enrollment count function
CREATE OR REPLACE FUNCTION public.update_enrollment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment + 1 WHERE id = NEW.class_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            UPDATE public.classes SET current_enrollment = current_enrollment - 1 WHERE id = NEW.class_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        UPDATE public.classes SET current_enrollment = current_enrollment - 1 WHERE id = OLD.class_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$;
