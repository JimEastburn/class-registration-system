import { describe, it, expect } from 'vitest';
import { getClassesForBlock, ScheduleClassData, TIME_BLOCKS } from '../schedule-helpers';

describe('getClassesForBlock', () => {
    const mockClassBase: ScheduleClassData = {
        id: '1',
        name: 'Math',
        recurrence_pattern: 'weekly',
        recurrence_days: ['tuesday'],
        recurrence_time: TIME_BLOCKS[0].startTime, // Block 1
        recurrence_duration: 70,
        schedule: 'Tue 9:30 AM',
        teacher: { last_name: 'Smith' }
    };

    it('should match a class on a single day in Block 1', () => {
        const classes = [mockClassBase];
        // Block 1 start
        const result = getClassesForBlock(classes, 'Tuesday', TIME_BLOCKS[0].startTime);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should not match a class on a wrong day', () => {
        const classes = [mockClassBase];
        const result = getClassesForBlock(classes, 'Wednesday', TIME_BLOCKS[0].startTime);
        expect(result).toHaveLength(0);
    });

    it('should not match a class at a wrong block time', () => {
        const classes = [mockClassBase];
        // Block 2 start
        const result = getClassesForBlock(classes, 'Tuesday', TIME_BLOCKS[1].startTime);
        expect(result).toHaveLength(0);
    });

    it('should match a class on a combined day (Tuesday part)', () => {
        const classes = [mockClassBase];
        const result = getClassesForBlock(classes, 'Tuesday/Thursday', TIME_BLOCKS[0].startTime);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
    });

    it('should match a class on a combined day (Thursday part)', () => {
        const thursdayClass = { ...mockClassBase, recurrence_days: ['thursday'] };
        const classes = [thursdayClass];
        const result = getClassesForBlock(classes, 'Tuesday/Thursday', TIME_BLOCKS[0].startTime);
        expect(result).toHaveLength(1);
    });
    
    it('should filter correctly from mixed list', () => {
        const class1 = { ...mockClassBase, id: '1', recurrence_time: TIME_BLOCKS[0].startTime };
        const class2 = { ...mockClassBase, id: '2', recurrence_time: TIME_BLOCKS[1].startTime };
        const classes = [class1, class2];
        
        const result1 = getClassesForBlock(classes, 'Tuesday', TIME_BLOCKS[0].startTime);
        expect(result1).toHaveLength(1);
        expect(result1[0].id).toBe('1');
        
        const result2 = getClassesForBlock(classes, 'Tuesday', TIME_BLOCKS[1].startTime);
        expect(result2).toHaveLength(1);
        expect(result2[0].id).toBe('2');
    });
});
