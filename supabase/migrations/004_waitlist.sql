-- Waitlist table for full classes
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'enrolled', 'expired', 'cancelled')),
    notified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_waitlist_class_id ON waitlist(class_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_parent_id ON waitlist(parent_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Parents can view their own waitlist entries"
    ON waitlist FOR SELECT
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert waitlist entries for their family"
    ON waitlist FOR INSERT
    WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can cancel their own waitlist entries"
    ON waitlist FOR UPDATE
    USING (auth.uid() = parent_id)
    WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Admins can view all waitlist entries"
    ON waitlist FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all waitlist entries"
    ON waitlist FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Function to get next position in waitlist
CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1 INTO next_pos
    FROM waitlist
    WHERE class_id = p_class_id AND status = 'waiting';
    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;
