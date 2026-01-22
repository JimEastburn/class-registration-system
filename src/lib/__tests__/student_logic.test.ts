import { describe, it, expect } from 'vitest';
import {
    calculateSpotsLeft,
    isClassFull,
    generateScheduleText,
    validateGradeLevel,
    getInitials,
    formatCurrency
} from '../utils';

describe('Student Logic Utilities', () => {
    describe('calculateSpotsLeft', () => {
        it('should return correct number of spots left', () => {
            expect(calculateSpotsLeft(20, 15)).toBe(5);
            expect(calculateSpotsLeft(10, 10)).toBe(0);
        });

        it('should not return negative spots', () => {
            expect(calculateSpotsLeft(10, 12)).toBe(0);
        });
    });

    describe('isClassFull', () => {
        it('should return true if current enrollment is equal to max students', () => {
            expect(isClassFull(10, 10)).toBe(true);
        });

        it('should return true if current enrollment exceeds max students', () => {
            expect(isClassFull(10, 12)).toBe(true);
        });

        it('should return false if there are spots left', () => {
            expect(isClassFull(10, 5)).toBe(false);
        });
    });

    describe('generateScheduleText', () => {
        it('should format multiple days correctly', () => {
            const result = generateScheduleText('weekly', ['monday', 'wednesday'], '15:00', 60);
            expect(result).toBe('Monday, Wednesday at 15:00 (1h)');
        });

        it('should format pattern without days correctly', () => {
            const result = generateScheduleText('daily', [], '09:00', 45);
            expect(result).toBe('Daily at 09:00 (45m)');
        });

        it('should handle zero duration correctly', () => {
            const result = generateScheduleText('weekly', ['friday'], '10:00', null);
            expect(result).toBe('Friday at 10:00');
        });
    });

    describe('validateGradeLevel', () => {
        it('should return true for valid grades 6-12', () => {
            expect(validateGradeLevel('6')).toBe(true);
            expect(validateGradeLevel('12')).toBe(true);
            expect(validateGradeLevel('9')).toBe(true);
        });

        it('should return false for invalid grades', () => {
            expect(validateGradeLevel('5')).toBe(false);
            expect(validateGradeLevel('13')).toBe(false);
            expect(validateGradeLevel('K')).toBe(false);
        });
    });

    describe('getInitials', () => {
        it('should return correct initials', () => {
            expect(getInitials('John', 'Doe')).toBe('JD');
            expect(getInitials('alice', 'wonderland')).toBe('AW');
        });
    });

    describe('formatCurrency', () => {
        it('should format numbers as USD', () => {
            expect(formatCurrency(10.5)).toBe('$10.50');
            expect(formatCurrency(100)).toBe('$100.00');
        });
    });
});
