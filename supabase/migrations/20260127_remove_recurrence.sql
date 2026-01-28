-- Migration: Remove recurrence system, add simpler schedule columns
-- This migration replaces the recurrence_* columns with schedule_days and schedule_time

-- 1. Add new columns
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days text[];
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time time;

-- 2. Migrate existing data from recurrence columns to new columns
UPDATE classes
SET schedule_days = recurrence_days,
    schedule_time = recurrence_time
WHERE recurrence_days IS NOT NULL OR recurrence_time IS NOT NULL;

-- 3. Drop old recurrence columns
ALTER TABLE classes DROP COLUMN IF EXISTS recurrence_pattern;
ALTER TABLE classes DROP COLUMN IF EXISTS recurrence_days;
ALTER TABLE classes DROP COLUMN IF EXISTS recurrence_time;
ALTER TABLE classes DROP COLUMN IF EXISTS recurrence_duration;
ALTER TABLE classes DROP COLUMN IF EXISTS recurrence_end_date;
