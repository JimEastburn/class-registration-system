
import { describe, it, expect } from 'vitest';
import {
  cn,
  centsToDollars,
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
  isStrongPassword
} from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('c1', 'c2')).toBe('c1 c2');
      expect(cn('c1', { c2: true, c3: false })).toBe('c1 c2');
      expect(cn('p-4', 'p-2')).toBe('p-2'); // Tailwind merge
    });
  });

  describe('formatCurrency', () => {
    it('formats USD', () => {
      expect(formatCurrency(10)).toBe('$10.00');
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('converts from cents when fromCents is true', () => {
      expect(formatCurrency(4800, true)).toBe('$48.00');
      expect(formatCurrency(100, true)).toBe('$1.00');
      expect(formatCurrency(9999, true)).toBe('$99.99');
    });

    it('does not convert when fromCents is false or omitted', () => {
      expect(formatCurrency(48)).toBe('$48.00');
      expect(formatCurrency(48, false)).toBe('$48.00');
    });
  });

  describe('centsToDollars', () => {
    it('converts cents to dollars', () => {
      expect(centsToDollars(4800)).toBe(48);
      expect(centsToDollars(100)).toBe(1);
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(9999)).toBe(99.99);
    });
  });

  describe('calculateAge', () => {
      it('calculates age correctly', () => {
          const today = new Date();
          const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()).toISOString();
          expect(calculateAge(tenYearsAgo)).toBe(10);
      });
  });

  describe('validateGradeLevel', () => {
      it('validates grades', () => {
          expect(validateGradeLevel('elementary')).toBe(true);
          expect(validateGradeLevel('college')).toBe(false);
      });
  });

  describe('spots logic', () => {
      it('calculates spots left', () => {
          expect(calculateSpotsLeft(10, 5)).toBe(5);
          expect(calculateSpotsLeft(10, 15)).toBe(0);
      });
      it('checks isClassFull', () => {
          expect(isClassFull(10, 10)).toBe(true);
          expect(isClassFull(10, 9)).toBe(false);
      });
  });

  describe('getInitials', () => {
      it('returns initials', () => {
          expect(getInitials('John', 'Doe')).toBe('JD');
          expect(getInitials('john', 'doe')).toBe('JD');
      });
  });

  describe('formatPhoneNumber', () => {
      it('formats phone', () => {
          expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
          expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
          expect(formatPhoneNumber('123')).toBe('123');
      });
  });

  describe('roles', () => {
      it('checks admin', () => {
          expect(isAdmin({ role: 'admin' })).toBe(true);
          expect(isAdmin({ role: 'parent' })).toBe(false);
          expect(isAdmin(null)).toBe(false);
      });
  });

  describe('validation', () => {
      it('validates email', () => {
          expect(isValidEmail('test@test.com')).toBe(true);
          expect(isValidEmail('invalid')).toBe(false);
      });

      it('checks strong password', () => {
          expect(isStrongPassword('Weak1').isValid).toBe(false);
          expect(isStrongPassword('StrongPass1').isValid).toBe(true);
      });
  });

  describe('generateInvoiceNumber', () => {
      it('generates invoice number', () => {
          expect(generateInvoiceNumber('payment_123456')).toBe('INV-PAYMENT_');
      });
  });

  describe('truncateText', () => {
      it('truncates text', () => {
          expect(truncateText('hello world', 5)).toBe('hello...');
          expect(truncateText('hello', 10)).toBe('hello');
      });
  });

  describe('date formatting', () => {
      it('formats date', () => {
          // Use noon to avoid timezone shift issues with date-only strings (which are UTC)
          expect(formatDate('2023-01-01T12:00:00')).toBe('January 1, 2023');
      });
      it('formats date time', () => {
          expect(formatDateTime('2023-01-01T12:00:00')).toContain('January 1, 2023');
      });
  });

  describe('waitlist', () => {
      it('gets next position', () => {
          expect(getNextWaitlistPosition([1, 2, 3])).toBe(4);
          expect(getNextWaitlistPosition([])).toBe(1);
      });
  });

  describe('totals', () => {
      it('calculates total', () => {
          expect(calculateTotal([10, 20, 30])).toBe(60);
      });
      it('calculates total by status', () => {
          const payments = [
              { amount: 10, status: 'paid' },
              { amount: 20, status: 'pending' },
              { amount: 30, status: 'paid' }
          ];
          expect(calculateTotalByStatus(payments, 'paid')).toBe(40);
      });
  });

  describe('other roles', () => {
      it('checks teacher', () => {
          expect(isTeacher({ role: 'teacher' })).toBe(true);
      });
      it('checks parent', () => {
          expect(isParent({ role: 'parent' })).toBe(true);
      });
  });

  describe('schedule text', () => {
      it('generates text', () => {
          expect(generateScheduleText('weekly', ['monday'], '10:00 AM', 60)).toBe('Monday at 10:00 AM (1h)');
          expect(generateScheduleText('none', [], null, null)).toBe('');
      });
  });
});
