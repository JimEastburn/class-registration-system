import { describe, it, expect } from 'vitest';

// Utility functions to test
function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function generateInvoiceNumber(paymentId: string): string {
    return `INV-${paymentId.slice(0, 8).toUpperCase()}`;
}

function calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function validateGradeLevel(grade: string): boolean {
    const validGrades = ['6', '7', '8', '9', '10', '11', '12'];
    return validGrades.includes(grade);
}

function calculateSpotsLeft(maxStudents: number, currentEnrollment: number): number {
    return Math.max(0, maxStudents - currentEnrollment);
}

function isClassFull(maxStudents: number, currentEnrollment: number): boolean {
    return currentEnrollment >= maxStudents;
}

function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

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
        // Date parsing can vary by timezone, so check for key components
        expect(result).toContain('2024');
        expect(result).toContain('September');
    });

    it('handles different date formats', () => {
        const result = formatDate('2024-01-01');
        // Could be Dec 31, 2023 or Jan 1, 2024 depending on timezone
        expect(result).toMatch(/(2023|2024)/);
        expect(result).toMatch(/(January|December)/);
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
