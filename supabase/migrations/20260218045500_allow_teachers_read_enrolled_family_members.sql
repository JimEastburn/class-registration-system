-- Allow teachers to view family members enrolled in their classes
CREATE POLICY "Teachers can view family members enrolled in their classes"
  ON public.family_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.classes c ON c.id = e.class_id
      WHERE e.student_id = family_members.id
        AND c.teacher_id = auth.uid()
    )
  );
