import { describe, it, expect } from 'vitest';
import { validateScheduleConfig, checkRoomConflict, detectBatchConflicts, checkScheduleConflict } from './scheduling';
import { ScheduleConfig, Class } from '@/types';

describe('validateScheduleConfig', () => {
  it('should accept valid schedule configurations', () => {
    const validConfig: ScheduleConfig = {
      day: 'Tuesday',
      block: 'Block 1',
      recurring: true,
    };
    const result = validateScheduleConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept all valid days', () => {
    const days = ['Tuesday/Thursday', 'Tuesday', 'Wednesday', 'Thursday'];
    days.forEach((day) => {
      const result = validateScheduleConfig({
        day: day,
        block: 'Block 1',
        recurring: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  it('should accept all valid blocks', () => {
    const blocks = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'];
    blocks.forEach((block) => {
      const result = validateScheduleConfig({
        day: 'Tuesday',
        block: block,
        recurring: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  it('should reject invalid days', () => {
    const invalidDays = ['Monday', 'Friday', 'Saturday', 'Sunday', 'Funday'];
    invalidDays.forEach((day) => {
      const result = validateScheduleConfig({
        day: day,
        block: 'Block 1',
        recurring: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid day');
    });
  });

  it('should reject invalid blocks', () => {
    const invalidBlocks = ['Lunch', 'Block 6', 'Homeroom'];
    invalidBlocks.forEach((block) => {
        const result = validateScheduleConfig({
            day: 'Tuesday',
            block: block,
            recurring: true,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid block');
    });
  });

  it('should require both day and block', () => {
    const result = validateScheduleConfig({
        recurring: true
    } as ScheduleConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Day and Block are required.');
  })
});

describe('checkRoomConflict', () => {
    const existingClasses = [
        {
            id: '1',
            location: 'Room 101',
            status: 'published',
            schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true }
        }
    ] as Class[];

    it('should return null if no conflict', () => {
        const result = checkRoomConflict(
            { day: 'Wednesday', block: 'Block 1', recurring: true },
            'Room 101',
            existingClasses
        );
        expect(result).toBeNull();
    });

    it('should return conflicting class if room matches', () => {
        const result = checkRoomConflict(
            { day: 'Tuesday', block: 'Block 1', recurring: true },
            'Room 101',
            existingClasses
        );
        expect(result).toBeDefined();
        expect(result?.id).toBe('1');
    });

    it('should return null if different room', () => {
        const result = checkRoomConflict(
            { day: 'Tuesday', block: 'Block 1', recurring: true },
            'Room 102',
            existingClasses
        );
        expect(result).toBeNull();
    });
});

describe('detectBatchConflicts', () => {
    const classes = [
        {
            id: '1',
            teacher_id: 't1',
            location: 'Room 101',
            status: 'published',
            schedule_config: { day: 'Tuesday', block: 'Block 1' }
        },
        {
            id: '2',
            teacher_id: 't2', // different teacher
            location: 'Room 101', // same room
            status: 'published',
            schedule_config: { day: 'Tuesday', block: 'Block 1' } // same time
        },
        {
            id: '3',
            teacher_id: 't1', // same teacher as 1
            location: 'Room 102',
            status: 'published',
            schedule_config: { day: 'Tuesday', block: 'Block 1' } // same time as 1
        },
        {
            id: '4',
            teacher_id: 't3',
            location: 'Room 103',
            status: 'published',
            schedule_config: { day: 'Wednesday', block: 'Block 2' } // no conflict
        }
    ] as Class[];

    it('should detect all conflicts', () => {
        const conflicts = detectBatchConflicts(classes);
        
        // 1 and 2 conflict on Room 101
        // 1 and 3 conflict on Teacher t1
        // So 1, 2, 3 should all be conflicts
        expect(conflicts.has('1')).toBe(true);
        expect(conflicts.has('2')).toBe(true);
        expect(conflicts.has('3')).toBe(true);
        expect(conflicts.has('4')).toBe(false);
    });
});

describe('checkScheduleConflict', () => {
    const existingClasses = [
        {
            id: '1',
            teacher_id: 't1',
            status: 'published',
            schedule_config: { day: 'Tuesday', block: 'Block 1' }
        }
    ] as Class[];

    it('should return null if no conflict', () => {
        const result = checkScheduleConflict(
            { day: 'Wednesday', block: 'Block 1', recurring: true },
            't1',
            existingClasses
        );
        expect(result).toBeNull();
    });

    it('should return conflicting class if teacher matches', () => {
        const result = checkScheduleConflict(
            { day: 'Tuesday', block: 'Block 1', recurring: true },
            't1',
            existingClasses
        );
        expect(result).toBeDefined();
        expect(result?.id).toBe('1');
    });

    it('should return null if different teacher', () => {
        const result = checkScheduleConflict(
            { day: 'Tuesday', block: 'Block 1', recurring: true },
            't2',
            existingClasses
        );
        expect(result).toBeNull();
    });
});
