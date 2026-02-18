
-- Students can view their own enrollments
-- (enrollments.student_id is a family_members.id, linked to auth via student_user_id)
CREATE POLICY "Students can view their own enrollments"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.id = enrollments.student_id
        AND family_members.student_user_id = auth.uid()
    )
  );

-- Calendar events: authenticated users can view events for published classes
-- This is safe because the classes themselves are already publicly visible when published
CREATE POLICY "Authenticated users can view calendar events for published classes"
  ON public.calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = calendar_events.class_id
        AND classes.status = 'published'
    )
  );

-- Admins/schedulers can manage all calendar events
CREATE POLICY "Admins and schedulers can manage all calendar events"
  ON public.calendar_events
  FOR ALL
  USING (
    has_role('admin'::"UserRole")
    OR has_role('super_admin'::"UserRole")
    OR has_role('class_scheduler'::"UserRole")
  );

-- Teachers can manage calendar events for their own classes
CREATE POLICY "Teachers can manage their class calendar events"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = calendar_events.class_id
        AND classes.teacher_id = auth.uid()
    )
  );
