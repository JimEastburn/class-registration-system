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
    role: z.enum(['parent', 'teacher', 'student', 'admin'], {
        message: 'Please select Parent/Guardian or Student or Teacher',
    }),
    phone: z.string().optional(),
    codeOfConduct: z.boolean().refine((val) => val === true, {
        message: 'You must agree to the Community Code of Conduct',
    }),
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

// Family Member schema
export const familyMemberSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    relationship: z.enum(['child', 'spouse', 'guardian', 'other']),
    gradeLevel: z.enum(['elementary', 'middle school', 'high school', '']).optional().nullable(),
    birthDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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
    recurrence_pattern: z.string().optional(),
    recurrence_days: z.string().optional(), // Passed as JSON string from hidden input
    recurrence_time: z.string().optional(),
    recurrence_duration: z.string().optional(), // Passed as string from select
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
}).refine((data) => {
    // Only validate if weekly/biweekly
    if (data.recurrence_pattern === 'weekly' || data.recurrence_pattern === 'biweekly') {
        if (!data.recurrence_days) return false;
        
        try {
            const days = JSON.parse(data.recurrence_days);
            if (!Array.isArray(days)) return false;
            
            // Allow Tue/Thu
            const isTueThu = days.length === 2 && 
                days.includes('tuesday') && 
                days.includes('thursday');
                
            // Allow Wed
            const isWed = days.length === 1 && days.includes('wednesday');
            
            return isTueThu || isWed;
        } catch {
            return false;
        }
    }
    return true;
}, {
    message: 'Classes can only be scheduled on Tuesdays/Thursdays OR Wednesdays.',
    path: ['recurrence_days'], // This might show up as a form error if handled by UI
});

export type ClassFormData = z.infer<typeof classSchema>;

// Enrollment schema
export const enrollmentSchema = z.object({
    studentId: z.string().uuid('Please select a student'),
    classId: z.string().uuid('Please select a class'),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;
