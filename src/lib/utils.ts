import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format a number as USD currency
 * @param amount - Amount in dollars (or cents if fromCents is true)
 * @param fromCents - If true, converts from cents to dollars before formatting
 */
export function formatCurrency(amount: number, fromCents: boolean = false): string {
  const dollars = fromCents ? centsToDollars(amount) : amount;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date string with time
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate invoice number from payment ID
 */
export function generateInvoiceNumber(paymentId: string): string {
  return `INV-${paymentId.slice(0, 8).toUpperCase()}`;
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validate grade level (6-12)
 */
export function validateGradeLevel(grade: string): boolean {
  const validGrades = ['elementary', 'middle school', 'high school'];
  return validGrades.includes(grade);
}

/**
 * Calculate spots left in a class
 */
export function calculateSpotsLeft(maxStudents: number, currentEnrollment: number): number {
  return Math.max(0, maxStudents - currentEnrollment);
}

/**
 * Check if class is full
 */
export function isClassFull(maxStudents: number, currentEnrollment: number): boolean {
  return currentEnrollment >= maxStudents;
}

/**
 * Get initials from first and last name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format phone number to (XXX) XXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get next waitlist position
 */
export function getNextWaitlistPosition(currentPositions: number[]): number {
  return currentPositions.length > 0
    ? Math.max(...currentPositions) + 1
    : 1;
}

/**
 * Calculate total from array of amounts
 */
export function calculateTotal(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Filter payments by status and calculate total
 */
export function calculateTotalByStatus(
  payments: { amount: number; status: string }[],
  status: string
): number {
  return payments
    .filter(p => p.status === status)
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Check if user has admin role
 */
export function isAdmin(userMetadata: { role?: string } | null): boolean {
  return userMetadata?.role === 'admin';
}

/**
 * Check if user has teacher role
 */
export function isTeacher(userMetadata: { role?: string } | null): boolean {
  return userMetadata?.role === 'teacher';
}

/**
 * Check if user has parent role
 */
export function isParent(userMetadata: { role?: string } | null): boolean {
  return userMetadata?.role === 'parent';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Generate schedule text from recurrence data
 */
export function generateScheduleText(
  pattern: string,
  days: string[],
  time: string | null,
  duration: number | null
): string {
  if (pattern === 'none' || !pattern) return '';

  let text = '';

  if (days.length > 0) {
    const dayLabels = days.map(d => d.charAt(0).toUpperCase() + d.slice(1));
    text = dayLabels.join(', ');
  } else {
    text = pattern.charAt(0).toUpperCase() + pattern.slice(1);
  }

  if (time) {
    text += ` at ${time}`;
  }

  if (duration) {
    if (duration >= 60) {
      text += ` (${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ''})`;
    } else {
      text += ` (${duration}m)`;
    }
  }

  return text;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
