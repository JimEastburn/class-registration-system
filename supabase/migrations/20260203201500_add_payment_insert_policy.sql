-- Add RLS policy for parents to create payments
CREATE POLICY "Parents can create payments for their enrollments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM enrollments 
    JOIN family_members ON enrollments.student_id = family_members.id 
    WHERE enrollments.id = payments.enrollment_id 
    AND family_members.parent_id = auth.uid()
  )
);
