
-- Students can read their own family_members row (linked via student_user_id)
CREATE POLICY "Students can view their own family member record"
  ON public.family_members FOR SELECT
  USING (auth.uid() = student_user_id);

-- Students can update student_user_id on their own row (self-heal link)
CREATE POLICY "Students can update their own student link"
  ON public.family_members FOR UPDATE
  USING (auth.uid() = student_user_id)
  WITH CHECK (auth.uid() = student_user_id);
