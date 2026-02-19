-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access on profiles" ON public.profiles
  FOR ALL USING (is_admin());
CREATE POLICY "Teachers can view student profiles" ON public.profiles
  FOR SELECT USING (
    has_role('teacher') AND (
      role = 'student' OR role = 'parent'
    )
  );

-- Family members policies
CREATE POLICY "Parents can view own family" ON public.family_members
  FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY "Parents can insert family" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can update own family" ON public.family_members
  FOR UPDATE USING (auth.uid() = parent_id);
CREATE POLICY "Parents can delete own family" ON public.family_members
  FOR DELETE USING (auth.uid() = parent_id);
CREATE POLICY "Admin full access on family_members" ON public.family_members
  FOR ALL USING (is_admin());
CREATE POLICY "Teachers can view enrolled students family" ON public.family_members
  FOR SELECT USING (
    has_role('teacher') AND is_teacher_of_student(id)
  );

-- Classes policies
CREATE POLICY "Anyone can view published classes" ON public.classes
  FOR SELECT USING (status = 'published');
CREATE POLICY "Teachers can manage own classes" ON public.classes
  FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Admin full access on classes" ON public.classes
  FOR ALL USING (is_admin());

-- Enrollments policies
CREATE POLICY "Parents can view own enrollments" ON public.enrollments
  FOR SELECT USING (
    student_id IN (SELECT id FROM public.family_members WHERE parent_id = auth.uid())
  );
CREATE POLICY "Parents can insert enrollment" ON public.enrollments
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.family_members WHERE parent_id = auth.uid())
  );
CREATE POLICY "Teachers can view class enrollments" ON public.enrollments
  FOR SELECT USING (
    class_id IN (SELECT id FROM public.classes WHERE teacher_id = auth.uid())
  );
CREATE POLICY "Admin full access on enrollments" ON public.enrollments
  FOR ALL USING (is_admin());

-- Payments policies
CREATE POLICY "Parents can view own payments" ON public.payments
  FOR SELECT USING (
    enrollment_id IN (
      SELECT e.id FROM public.enrollments e
      JOIN public.family_members fm ON e.student_id = fm.id
      WHERE fm.parent_id = auth.uid()
    )
  );
CREATE POLICY "Admin full access on payments" ON public.payments
  FOR ALL USING (is_admin());

-- Audit logs policies
CREATE POLICY "Admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (is_admin());
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Calendar events policies
CREATE POLICY "Anyone can view calendar events" ON public.calendar_events
  FOR SELECT USING (true);
CREATE POLICY "Admin full access on calendar_events" ON public.calendar_events
  FOR ALL USING (is_admin());

-- Class materials policies
CREATE POLICY "Enrolled students can view materials" ON public.class_materials
  FOR SELECT USING (true);
CREATE POLICY "Admin full access on class_materials" ON public.class_materials
  FOR ALL USING (is_admin());

-- System settings policies
CREATE POLICY "Anyone can view system settings" ON public.system_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin can manage system settings" ON public.system_settings
  FOR ALL USING (is_admin());
