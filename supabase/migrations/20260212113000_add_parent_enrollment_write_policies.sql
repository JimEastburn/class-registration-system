-- Allow parents to create pending/waitlisted enrollments for their own family members
CREATE POLICY "Parents can create enrollments for their family"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_members.id = enrollments.student_id
      AND family_members.parent_id = auth.uid()
  )
  AND enrollments.status IN ('pending', 'waitlisted')
);

-- Allow parents to remove only their own unpaid/waitlisted enrollments
CREATE POLICY "Parents can delete their own pending enrollments"
ON public.enrollments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_members.id = enrollments.student_id
      AND family_members.parent_id = auth.uid()
  )
  AND enrollments.status IN ('pending', 'waitlisted')
);
