-- Class materials table for file uploads
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS class_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'doc', 'image', 'video', 'link', 'other'
    file_size INTEGER, -- Size in bytes (null for links)
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false, -- If true, visible to enrolled students
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_materials_class_id ON class_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_class_materials_uploaded_by ON class_materials(uploaded_by);

-- Enable RLS
ALTER TABLE class_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can manage materials for their own classes
CREATE POLICY "Teachers can view their class materials"
    ON class_materials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_materials.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can insert materials for their classes"
    ON class_materials FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_materials.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update their class materials"
    ON class_materials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_materials.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete their class materials"
    ON class_materials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_materials.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- Students can view public materials for classes they're enrolled in
CREATE POLICY "Enrolled students can view public materials"
    ON class_materials FOR SELECT
    USING (
        is_public = true
        AND EXISTS (
            SELECT 1 FROM enrollments e
            JOIN family_members fm ON fm.id = e.student_id
            WHERE e.class_id = class_materials.class_id
            AND e.status IN ('confirmed', 'completed')
            AND fm.parent_id = auth.uid()
        )
    );

-- Parents can view public materials for classes their children are enrolled in
CREATE POLICY "Parents can view materials for enrolled children"
    ON class_materials FOR SELECT
    USING (
        is_public = true
        AND EXISTS (
            SELECT 1 FROM enrollments e
            JOIN family_members fm ON fm.id = e.student_id
            WHERE e.class_id = class_materials.class_id
            AND e.status IN ('confirmed', 'completed')
            AND fm.parent_id = auth.uid()
        )
    );

-- Admins can manage all materials
CREATE POLICY "Admins can view all materials"
    ON class_materials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all materials"
    ON class_materials FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create a storage bucket for class materials (run this separately in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('class-materials', 'class-materials', false);

COMMENT ON TABLE class_materials IS 'Stores metadata for class materials and resources uploaded by teachers';
