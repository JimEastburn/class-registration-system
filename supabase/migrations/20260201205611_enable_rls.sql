-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.has_role(required_role "UserRole")
RETURNS BOOLEAN AS $$
DECLARE
  user_role "UserRole";
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins and Super Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('super_admin')
  );

-- Family Members Policies
CREATE POLICY "Parents can view and manage their own family" ON public.family_members
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "Admins can view all family members" ON public.family_members
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('super_admin')
  );

-- Classes Policies
CREATE POLICY "Public can view published classes" ON public.classes
  FOR SELECT USING (status = 'published');

CREATE POLICY "Teachers can manage their own classes" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Admins and Schedulers can manage all classes" ON public.classes
  FOR ALL USING (
    public.has_role('admin') OR 
    public.has_role('super_admin') OR 
    public.has_role('class_scheduler')
  );

-- Enrollments Policies
CREATE POLICY "Parents can view their family enrollments" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE id = enrollments.student_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view enrollments for their classes" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = enrollments.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all enrollments" ON public.enrollments
  FOR ALL USING (
    public.has_role('admin') OR public.has_role('super_admin')
  );

-- Payments Policies
CREATE POLICY "Parents can view their payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      JOIN public.family_members ON enrollments.student_id = family_members.id
      WHERE enrollments.id = payments.enrollment_id AND family_members.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('super_admin')
  );

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    public.has_role('admin') OR public.has_role('super_admin')
  );
