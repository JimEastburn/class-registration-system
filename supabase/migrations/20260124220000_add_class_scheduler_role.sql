-- Add class_scheduler to role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('parent', 'teacher', 'student', 'admin', 'class_scheduler'));

-- Helper function to check for class_scheduler role
CREATE OR REPLACE FUNCTION public.is_class_scheduler()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'class_scheduler'
  );
$$;

-- Classes Policies
CREATE POLICY "Classes - Class Scheduler manage all" ON public.classes 
    FOR ALL TO authenticated 
    USING (is_class_scheduler()) 
    WITH CHECK (is_class_scheduler());

-- Enrollments Policies
CREATE POLICY "Enrollments - Class Scheduler view all" ON public.enrollments 
    FOR SELECT TO authenticated 
    USING (is_class_scheduler());

-- Waitlist Policies
CREATE POLICY "Waitlist - Class Scheduler manage all" ON public.waitlist 
    FOR ALL TO authenticated 
    USING (is_class_scheduler()) 
    WITH CHECK (is_class_scheduler());

-- Class Materials Policies
CREATE POLICY "Class Materials - Class Scheduler manage all" ON public.class_materials 
    FOR ALL TO authenticated 
    USING (is_class_scheduler()) 
    WITH CHECK (is_class_scheduler());
