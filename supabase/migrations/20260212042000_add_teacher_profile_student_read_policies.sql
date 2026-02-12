-- Allow authenticated users to read profiles of teachers
-- This is needed so students can see teacher info on class detail pages
CREATE POLICY "Authenticated users can view teacher profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes WHERE classes.teacher_id = profiles.id
    )
  );

-- Allow authenticated users to read class_materials for published classes
-- class_materials has RLS enabled but no policies, completely blocking reads
CREATE POLICY "Authenticated users can view materials for published classes"
  ON class_materials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = class_materials.class_id
      AND classes.status = 'published'
    )
  );
