-- Drop the existing constraint
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_grade_level_check;

-- Update existing data
UPDATE family_members
SET grade_level = 'middle school'
WHERE grade_level IN ('6', '7', '8');

UPDATE family_members
SET grade_level = 'high school'
WHERE grade_level IN ('9', '10', '11', '12');

-- Add new constraint
ALTER TABLE family_members
ADD CONSTRAINT family_members_grade_level_check
CHECK (grade_level IN ('elementary', 'middle school', 'high school'));
