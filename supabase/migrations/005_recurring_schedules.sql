-- Add recurring schedule fields to classes table
-- Run this in your Supabase SQL editor

-- Add new columns for recurring schedules
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('none', 'daily', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recurrence_days TEXT[]; -- Array of days: ['monday', 'wednesday', 'friday']
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recurrence_time TIME; -- Start time for recurring sessions
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recurrence_duration INTEGER; -- Duration in minutes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS recurrence_end_date DATE; -- When recurrence ends (optional, defaults to end_date)

-- Set default for existing classes
UPDATE classes SET recurrence_pattern = 'none' WHERE recurrence_pattern IS NULL;

-- Make recurrence_pattern NOT NULL with default
ALTER TABLE classes ALTER COLUMN recurrence_pattern SET DEFAULT 'none';

-- Create a function to generate schedule text from recurrence fields
CREATE OR REPLACE FUNCTION generate_schedule_text(
    p_recurrence_pattern TEXT,
    p_recurrence_days TEXT[],
    p_recurrence_time TIME,
    p_recurrence_duration INTEGER
)
RETURNS TEXT AS $$
DECLARE
    days_text TEXT;
    time_text TEXT;
    duration_text TEXT;
BEGIN
    IF p_recurrence_pattern = 'none' OR p_recurrence_pattern IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Format days
    IF p_recurrence_days IS NOT NULL AND array_length(p_recurrence_days, 1) > 0 THEN
        days_text := array_to_string(
            ARRAY(
                SELECT initcap(unnest(p_recurrence_days))
            ), ', '
        );
    ELSE
        days_text := initcap(p_recurrence_pattern);
    END IF;
    
    -- Format time
    IF p_recurrence_time IS NOT NULL THEN
        time_text := to_char(p_recurrence_time, 'HH:MI AM');
    ELSE
        time_text := 'TBD';
    END IF;
    
    -- Format duration
    IF p_recurrence_duration IS NOT NULL THEN
        IF p_recurrence_duration >= 60 THEN
            duration_text := (p_recurrence_duration / 60)::TEXT || ' hour' || 
                CASE WHEN p_recurrence_duration >= 120 THEN 's' ELSE '' END;
        ELSE
            duration_text := p_recurrence_duration::TEXT || ' min';
        END IF;
    ELSE
        duration_text := '';
    END IF;
    
    RETURN days_text || ' at ' || time_text || 
        CASE WHEN duration_text != '' THEN ' (' || duration_text || ')' ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the columns
COMMENT ON COLUMN classes.recurrence_pattern IS 'Frequency of class sessions: none, daily, weekly, biweekly, monthly';
COMMENT ON COLUMN classes.recurrence_days IS 'Array of weekdays when class occurs, e.g. [monday, wednesday]';
COMMENT ON COLUMN classes.recurrence_time IS 'Time of day when class starts';
COMMENT ON COLUMN classes.recurrence_duration IS 'Duration of each session in minutes';
