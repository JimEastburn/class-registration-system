-- Create class_blocks table
CREATE TABLE IF NOT EXISTS public.class_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
    reason TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_blocks_class_id ON public.class_blocks(class_id);
CREATE INDEX IF NOT EXISTS idx_class_blocks_student_id ON public.class_blocks(student_id);

ALTER TABLE public.class_blocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can manage blocks for their classes" 
    ON public.class_blocks 
    FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = class_blocks.class_id 
        AND classes.teacher_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = class_blocks.class_id 
        AND classes.teacher_id = auth.uid()
    ));

CREATE POLICY "Admins can manage all blocks" 
    ON public.class_blocks 
    FOR ALL 
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "View blocks" 
    ON public.class_blocks 
    FOR SELECT 
    USING (
        is_admin() OR 
        EXISTS (
            SELECT 1 FROM public.classes 
            WHERE classes.id = class_blocks.class_id 
            AND classes.teacher_id = auth.uid()
        )
    );

-- Trigger to cancel enrollment if blocked
CREATE OR REPLACE FUNCTION public.handle_new_block()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.enrollments
    SET status = 'cancelled'
    WHERE class_id = NEW.class_id 
    AND student_id = NEW.student_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_block_created ON public.class_blocks;
CREATE TRIGGER on_block_created
    AFTER INSERT ON public.class_blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_block();
