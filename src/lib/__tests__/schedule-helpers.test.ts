import { describe, it, expect } from 'vitest';
import { getClassesForSlot, ScheduleClassData } from '../schedule-helpers';

describe('getClassesForSlot', () => {
    const mockClassBase: ScheduleClassData = {
        id: '1',
        name: 'Math',
        recurrence_pattern: 'weekly',
        recurrence_days: ['tuesday'],
        recurrence_time: '10:00',
        recurrence_duration: 60,
        schedule: null,
        teacher: { last_name: 'Smith' }
    };

    it('should match a class on a single day', () => {
        const classes = [mockClassBase];
        const result = getClassesForSlot(classes, 'Tuesday', 10);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should not match a class on a wrong day', () => {
        const classes = [mockClassBase];
        const result = getClassesForSlot(classes, 'Wednesday', 10);
        expect(result).toHaveLength(0);
    });

    it('should not match a class at a wrong time', () => {
        const classes = [mockClassBase];
        const result = getClassesForSlot(classes, 'Tuesday', 11);
        expect(result).toHaveLength(0);
    });

    it('should match a class on a combined day (Tuesday part)', () => {
        const classes = [mockClassBase];
        const result = getClassesForSlot(classes, 'Tuesday/Thursday', 10);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should match a class on a combined day (Thursday part)', () => {
        const thursdayClass = { ...mockClassBase, recurrence_days: ['thursday'] };
        const classes = [thursdayClass];
        const result = getClassesForSlot(classes, 'Tuesday/Thursday', 10);
        expect(result).toHaveLength(1);
    });
    
    it('should handle legacy schedule strings', () => {
        const legacyClass: ScheduleClassData = {
            ...mockClassBase,
            recurrence_pattern: null, // Legacy
            schedule: 'Mon 10am'
        };
        const classes = [legacyClass];
        expect(getClassesForSlot(classes, 'Monday', 10)).toHaveLength(1);
    });

    it('should handle legacy schedule strings on combined day', () => {
        const legacyClass: ScheduleClassData = {
            ...mockClassBase,
            recurrence_pattern: null, // Legacy
            schedule: 'Thu 2pm'
        };
        const classes = [legacyClass];
        // 2pm -> 14
        expect(getClassesForSlot(classes, 'Tuesday/Thursday', 14)).toHaveLength(1);
    });
});
