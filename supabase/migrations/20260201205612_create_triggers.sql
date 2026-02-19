-- Create triggers for updated_at timestamps
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Role change audit trigger
CREATE TRIGGER on_role_change AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

-- Enrollment status change audit trigger
CREATE TRIGGER on_enrollment_change AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.log_enrollment_change();

-- Enrollment count update trigger
CREATE TRIGGER on_enrollment_count_change AFTER INSERT OR UPDATE OR DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_count();
