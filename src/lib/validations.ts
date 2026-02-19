/**
 * Zod validation schemas for the Class Registration System
 * Used with react-hook-form for form validation
 */

import { z } from 'zod';

// =============================================================================
// Auth Schemas
// =============================================================================

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema
 */
export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string(),
    role: z.enum(['parent', 'teacher', 'student'], {
      message: 'Please select Parent/Guardian or Student or Teacher',
    }),
    phone: z.string().optional(),
    codeOfConduct: z.literal(true, {
      message: 'You must agree to the Community Code of Conduct',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Forgot password form schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password form schema
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// =============================================================================
// Profile Schemas
// =============================================================================

/**
 * Profile update schema
 */
export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  specializations: z.array(z.string()).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Profile address schema (billing address for Zoho invoices)
 */
export const profileAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Street address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string().min(5, 'ZIP code must be at least 5 characters'),
});

export type ProfileAddressFormData = z.infer<typeof profileAddressSchema>;

// =============================================================================
// Family Member Schemas
// =============================================================================

/**
 * Family member form schema
 */
export const familyMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  relationship: z.enum(['Student', 'Parent/Guardian'], {
    message: 'Please select a relationship',
  }),
  grade: z.enum([
    'elementary',
    'middle school',
    'high school'
  ]).optional(),
  dob: z.string().optional(), // ISO date string
}).refine((data) => {
  if (data.relationship === 'Student') {
    return !!data.grade;
  }
  return true;
}, {
  message: 'Grade is required for students',
  path: ['grade'],
});

export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

// =============================================================================
// Class Schemas
// =============================================================================

/**
 * Schedule configuration schema
 */
export const scheduleConfigSchema = z.object({
  day: z.enum(['Tuesday/Thursday', 'Tuesday', 'Wednesday', 'Thursday'], {
    message: 'Classes can only be scheduled on Tuesday/Thursday, Tuesday only, Wednesday only, or Thursday only',
  }),
  block: z.enum(['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'], {
    message: 'Classes can only be scheduled in Blocks 1-5',
  }),
  recurring: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ScheduleConfigFormData = z.infer<typeof scheduleConfigSchema>;

/**
 * Class form schema
 */
export const classSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
  capacity: z
    .number()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity cannot exceed 100'),
  price: z.number().min(0, 'Price cannot be negative'),
  location: z.string().optional(),
  scheduleConfig: scheduleConfigSchema.optional(),
});

export type ClassFormData = z.infer<typeof classSchema>;

// =============================================================================
// Enrollment Schemas
// =============================================================================

/**
 * Enrollment request schema
 */
export const enrollmentSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  classId: z.string().uuid('Invalid class ID'),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

// =============================================================================
// Calendar Event Schemas
// =============================================================================

/**
 * Calendar event form schema
 */
export const calendarEventSchema = z.object({
  classId: z.string().uuid('Invalid class ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  block: z.string().min(1, 'Block is required'),
  location: z.string().optional(),
  description: z.string().max(500).optional(),
});

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

// =============================================================================
// System Settings Schemas
// =============================================================================

export const registrationSettingsSchema = z.object({
  registrationOpen: z.boolean(),
  semesterStart: z.string().optional(), // ISO date
  semesterEnd: z.string().optional(),   // ISO date
});

export type RegistrationSettingsFormData = z.infer<typeof registrationSettingsSchema>;

export const classDefaultsSchema = z.object({
  defaultCapacity: z.number().min(1, 'Must be at least 1'),
  paymentDeadlineDays: z.number().min(0, 'Cannot be negative'),
});

export type ClassDefaultsFormData = z.infer<typeof classDefaultsSchema>;
