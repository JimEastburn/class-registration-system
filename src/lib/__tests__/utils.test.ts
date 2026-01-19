import { describe, it, expect } from 'vitest';
import {
    cn,
    formatCurrency,
    formatDate,
    formatDateTime,
    generateInvoiceNumber,
    calculateAge,
    validateGradeLevel,
    calculateSpotsLeft,
    isClassFull,
    getInitials,
    formatPhoneNumber,
    getNextWaitlistPosition,
    calculateTotal,
    calculateTotalByStatus,
    isAdmin,
    isTeacher,
    isParent,
    truncateText,
    generateScheduleText,
    isValidEmail,
    isStrongPassword,
} from '@/lib/utils';

describe('cn (class name utility)', () => {
    it('merges class names', () => {
        expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    });

    it('handles conditional classes', () => {
        expect(cn('base', true && 'active')).toBe('base active');
        expect(cn('base', false && 'hidden')).toBe('base');
    });
});

describe('formatCurrency', () => {
    it('formats whole numbers with cents', () => {
        expect(formatCurrency(100)).toBe('$100.00');
    });

    it('formats decimal amounts', () => {
        expect(formatCurrency(99.99)).toBe('$99.99');
    });

    it('formats zero', () => {
        expect(formatCurrency(0)).toBe('$0.00');
    });

    it('rounds to two decimal places', () => {
        expect(formatCurrency(19.999)).toBe('$20.00');
    });
});

describe('formatDate', () => {
    it('formats date string to readable format', () => {
        const result = formatDate('2024-09-15');
        expect(result).toContain('2024');
        expect(result).toContain('September');
    });

    it('handles different date formats', () => {
        const result = formatDate('2024-01-01');
        expect(result).toMatch(/(2023|2024)/);
        expect(result).toMatch(/(January|December)/);
    });
});

describe('formatDateTime', () => {
    it('includes time in output', () => {
        const result = formatDateTime('2024-09-15T14:30:00');
        expect(result).toContain('2024');
    });
});

describe('generateInvoiceNumber', () => {
    it('generates invoice number from payment ID', () => {
        const result = generateInvoiceNumber('550e8400-e29b-41d4-a716-446655440000');
        expect(result).toBe('INV-550E8400');
    });

    it('handles short IDs', () => {
        const result = generateInvoiceNumber('abc');
        expect(result).toBe('INV-ABC');
    });
});

describe('calculateAge', () => {
    it('calculates age correctly', () => {
        const today = new Date();
        const birthYear = today.getFullYear() - 15;
        const birthDate = `${birthYear}-01-01`;
        const age = calculateAge(birthDate);
        expect(age).toBeGreaterThanOrEqual(14);
        expect(age).toBeLessThanOrEqual(15);
    });
});

describe('validateGradeLevel', () => {
    it('accepts valid grade levels', () => {
        expect(validateGradeLevel('6')).toBe(true);
        expect(validateGradeLevel('9')).toBe(true);
        expect(validateGradeLevel('12')).toBe(true);
    });

    it('rejects invalid grade levels', () => {
        expect(validateGradeLevel('5')).toBe(false);
        expect(validateGradeLevel('13')).toBe(false);
        expect(validateGradeLevel('K')).toBe(false);
    });
});

describe('calculateSpotsLeft', () => {
    it('calculates spots left correctly', () => {
        expect(calculateSpotsLeft(20, 15)).toBe(5);
    });

    it('returns zero when full', () => {
        expect(calculateSpotsLeft(20, 20)).toBe(0);
    });

    it('returns zero when over capacity', () => {
        expect(calculateSpotsLeft(20, 25)).toBe(0);
    });
});

describe('isClassFull', () => {
    it('returns false when spots available', () => {
        expect(isClassFull(20, 15)).toBe(false);
    });

    it('returns true when at capacity', () => {
        expect(isClassFull(20, 20)).toBe(true);
    });

    it('returns true when over capacity', () => {
        expect(isClassFull(20, 25)).toBe(true);
    });
});

describe('getInitials', () => {
    it('returns uppercase initials', () => {
        expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('handles lowercase names', () => {
        expect(getInitials('jane', 'smith')).toBe('JS');
    });

    it('handles single character names', () => {
        expect(getInitials('A', 'B')).toBe('AB');
    });
});

describe('formatPhoneNumber', () => {
    it('formats 10-digit phone number', () => {
        expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('handles phone with dashes', () => {
        expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    });

    it('returns original if not 10 digits', () => {
        expect(formatPhoneNumber('12345')).toBe('12345');
    });
});

describe('getNextWaitlistPosition', () => {
    it('returns next position', () => {
        expect(getNextWaitlistPosition([1, 2, 3])).toBe(4);
    });

    it('returns 1 for empty array', () => {
        expect(getNextWaitlistPosition([])).toBe(1);
    });

    it('handles non-sequential positions', () => {
        expect(getNextWaitlistPosition([1, 5, 3])).toBe(6);
    });
});

describe('calculateTotal', () => {
    it('sums array of numbers', () => {
        expect(calculateTotal([10, 20, 30])).toBe(60);
    });

    it('returns 0 for empty array', () => {
        expect(calculateTotal([])).toBe(0);
    });
});

describe('calculateTotalByStatus', () => {
    it('calculates total for specific status', () => {
        const payments = [
            { amount: 100, status: 'completed' },
            { amount: 50, status: 'pending' },
            { amount: 75, status: 'completed' },
        ];
        expect(calculateTotalByStatus(payments, 'completed')).toBe(175);
    });

    it('returns 0 if no matching status', () => {
        const payments = [{ amount: 100, status: 'pending' }];
        expect(calculateTotalByStatus(payments, 'completed')).toBe(0);
    });
});

describe('Role checks', () => {
    describe('isAdmin', () => {
        it('returns true for admin role', () => {
            expect(isAdmin({ role: 'admin' })).toBe(true);
        });

        it('returns false for other roles', () => {
            expect(isAdmin({ role: 'parent' })).toBe(false);
        });

        it('handles null', () => {
            expect(isAdmin(null)).toBe(false);
        });
    });

    describe('isTeacher', () => {
        it('returns true for teacher role', () => {
            expect(isTeacher({ role: 'teacher' })).toBe(true);
        });

        it('returns false for other roles', () => {
            expect(isTeacher({ role: 'admin' })).toBe(false);
        });
    });

    describe('isParent', () => {
        it('returns true for parent role', () => {
            expect(isParent({ role: 'parent' })).toBe(true);
        });

        it('returns false for other roles', () => {
            expect(isParent({ role: 'student' })).toBe(false);
        });
    });
});

describe('truncateText', () => {
    it('truncates long text', () => {
        expect(truncateText('Hello World', 5)).toBe('Hello...');
    });

    it('returns original if shorter than max', () => {
        expect(truncateText('Hi', 10)).toBe('Hi');
    });

    it('returns original if equal to max', () => {
        expect(truncateText('Hello', 5)).toBe('Hello');
    });
});

describe('generateScheduleText', () => {
    it('returns empty for none pattern', () => {
        expect(generateScheduleText('none', [], null, null)).toBe('');
    });

    it('generates text with days', () => {
        const result = generateScheduleText('weekly', ['monday', 'wednesday'], null, null);
        expect(result).toContain('Monday');
        expect(result).toContain('Wednesday');
    });

    it('includes time when provided', () => {
        const result = generateScheduleText('weekly', ['monday'], '3:00 PM', null);
        expect(result).toContain('at 3:00 PM');
    });

    it('includes duration when provided', () => {
        const result = generateScheduleText('weekly', ['monday'], null, 60);
        expect(result).toContain('1h');
    });

    it('formats duration under an hour', () => {
        const result = generateScheduleText('weekly', ['monday'], null, 45);
        expect(result).toContain('45m');
    });
});

describe('isValidEmail', () => {
    it('accepts valid emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.org')).toBe(true);
    });

    it('rejects invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('no@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
    });
});

describe('isStrongPassword', () => {
    it('validates strong password', () => {
        const result = isStrongPassword('Password123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects short password', () => {
        const result = isStrongPassword('Pass1');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('rejects password without uppercase', () => {
        const result = isStrongPassword('password123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('rejects password without lowercase', () => {
        const result = isStrongPassword('PASSWORD123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('rejects password without number', () => {
        const result = isStrongPassword('PasswordABC');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
    });

    it('collects multiple errors', () => {
        const result = isStrongPassword('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
    });
});
