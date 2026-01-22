-- Create a security definer function to check if a teacher teaches a student
-- This bypasses RLS on enrollments to prevent recursion
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(check_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE e.student_id = check_student_id
    AND c.teacher_id = auth.uid()
  );
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Teachers can view students enrolled in their classes" ON family_members;

-- Create the new policy using the function
CREATE POLICY "Teachers can view students enrolled in their classes"
ON family_members
FOR SELECT
TO public
USING (
  is_teacher_of_student(id)
);
