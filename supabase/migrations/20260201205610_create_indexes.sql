-- Profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Family Members
CREATE INDEX IF NOT EXISTS family_members_parent_id_idx ON public.family_members(parent_id);

-- Classes
CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS classes_status_idx ON public.classes(status);

-- Enrollments
CREATE INDEX IF NOT EXISTS enrollments_class_id_status_idx ON public.enrollments(class_id, status);
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON public.enrollments(student_id);

-- Payments
CREATE INDEX IF NOT EXISTS payments_enrollment_id_idx ON public.payments(enrollment_id);

-- Calendar Events
CREATE INDEX IF NOT EXISTS calendar_events_class_id_idx ON public.calendar_events(class_id);
CREATE INDEX IF NOT EXISTS calendar_events_start_time_idx ON public.calendar_events(start_time);
