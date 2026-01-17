import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.enum(['parent', 'teacher', 'student', 'admin']),
    phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Login schema
export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Profile update schema
export const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().optional(),
    bio: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Family member schema
export const familyMemberSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    relationship: z.enum(['child', 'spouse', 'guardian', 'other']),
    gradeLevel: z.enum(['6', '7', '8', '9', '10', '11', '12']).optional(),
    birthDate: z.string().optional(),
    notes: z.string().optional(),
});

export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;

// Class schema
export const classSchema = z.object({
    name: z.string().min(1, 'Class name is required'),
    description: z.string().optional(),
    location: z.string().min(1, 'Location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    schedule: z.string().min(1, 'Schedule is required'),
    maxStudents: z.number().min(1, 'Maximum students must be at least 1'),
    fee: z.number().min(0, 'Fee cannot be negative'),
    syllabus: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
});

export type ClassFormData = z.infer<typeof classSchema>;

// Enrollment schema
export const enrollmentSchema = z.object({
    studentId: z.string().uuid('Please select a student'),
    classId: z.string().uuid('Please select a class'),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;
