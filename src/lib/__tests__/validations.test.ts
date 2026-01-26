import { describe, it, expect } from 'vitest';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    profileSchema,
    familyMemberSchema,
    classSchema,
    enrollmentSchema,
} from '@/lib/validations';

describe('registerSchema', () => {
    it('validates a correct registration form', () => {
        const validData = {
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            firstName: 'John',
            lastName: 'Doe',
            lastName: 'Doe',
            role: 'parent' as const,
            codeOfConduct: true,
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const invalidData = {
            email: 'invalid-email',
            password: 'Password123',
            confirmPassword: 'Password123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects password without lowercase', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'PASSWORD123',
            confirmPassword: 'PASSWORD123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'PasswordABC',
            confirmPassword: 'PasswordABC',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'Pass1',
            confirmPassword: 'Pass1',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects mismatched passwords', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password456',
            firstName: 'John',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects empty first name', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            firstName: '',
            lastName: 'Doe',
            role: 'parent' as const,
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects invalid role with custom message', () => {
        const invalidData = {
            email: 'test@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'invalid', // not cast as const to allow invalid string
        };

        const result = registerSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe(
                'Please select Parent/Guardian or Student or Teacher'
            );
        }
    });
});

describe('loginSchema', () => {
    it('validates correct login data', () => {
        const validData = {
            email: 'test@example.com',
            password: 'anypassword',
        };

        const result = loginSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const invalidData = {
            email: 'not-an-email',
            password: 'anypassword',
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
        const invalidData = {
            email: 'test@example.com',
            password: '',
        };

        const result = loginSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('forgotPasswordSchema', () => {
    it('validates correct email', () => {
        const validData = { email: 'test@example.com' };
        const result = forgotPasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
        const invalidData = { email: 'not-valid' };
        const result = forgotPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('resetPasswordSchema', () => {
    it('validates matching passwords with requirements', () => {
        const validData = {
            password: 'NewPassword123',
            confirmPassword: 'NewPassword123',
        };

        const result = resetPasswordSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects weak password', () => {
        const invalidData = {
            password: 'weak',
            confirmPassword: 'weak',
        };

        const result = resetPasswordSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('profileSchema', () => {
    it('validates correct profile data', () => {
        const validData = {
            firstName: 'John',
            lastName: 'Doe',
            phone: '123-456-7890',
            bio: 'A short bio',
        };

        const result = profileSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('allows optional fields to be empty', () => {
        const validData = {
            firstName: 'John',
            lastName: 'Doe',
        };

        const result = profileSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects empty first name', () => {
        const invalidData = {
            firstName: '',
            lastName: 'Doe',
        };

        const result = profileSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});

describe('familyMemberSchema', () => {
    it('validates correct family member data', () => {
        const validData = {
            firstName: 'Jane',
            lastName: 'Doe',
            relationship: 'child' as const,
            relationship: 'child' as const,
            gradeLevel: 'middle school' as const,
        };

        const result = familyMemberSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects invalid relationship', () => {
        const invalidData = {
            firstName: 'Jane',
            lastName: 'Doe',
            relationship: 'friend' as const,
        };

        const result = familyMemberSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('allows relationship without grade level', () => {
        const validData = {
            firstName: 'Jane',
            lastName: 'Doe',
            relationship: 'spouse' as const,
        };

        const result = familyMemberSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('allows null values for optional fields (regression test)', () => {
        const dataWithNulls = {
            firstName: 'Jane',
            lastName: 'Doe',
            relationship: 'child' as const,
            gradeLevel: null,
            birthDate: null,
            notes: null,
        };

        const result = familyMemberSchema.safeParse(dataWithNulls);
        expect(result.success).toBe(true);
    });

    it('allows empty strings for optional fields (regression test)', () => {
        const dataWithEmptyStrings = {
            firstName: 'Jane',
            lastName: 'Doe',
            relationship: 'child' as const,
            gradeLevel: '',
            birthDate: '',
            notes: '',
        };

        const result = familyMemberSchema.safeParse(dataWithEmptyStrings);
        expect(result.success).toBe(true);
    });
});

describe('classSchema', () => {
    it('validates correct class data', () => {
        const validData = {
            name: 'Introduction to Math',
            description: 'A beginner math class',
            location: 'Room 101',
            startDate: '2024-09-01',
            endDate: '2024-12-15',
            schedule: 'Mon/Wed 3:00 PM',
            maxStudents: 20,
            fee: 150,
        };

        const result = classSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects end date before start date', () => {
        const invalidData = {
            name: 'Introduction to Math',
            location: 'Room 101',
            startDate: '2024-12-15',
            endDate: '2024-09-01',
            schedule: 'Mon/Wed 3:00 PM',
            maxStudents: 20,
            fee: 150,
        };

        const result = classSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects zero max students', () => {
        const invalidData = {
            name: 'Introduction to Math',
            location: 'Room 101',
            startDate: '2024-09-01',
            endDate: '2024-12-15',
            schedule: 'Mon/Wed 3:00 PM',
            maxStudents: 0,
            fee: 150,
        };

        const result = classSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects negative fee', () => {
        const invalidData = {
            name: 'Introduction to Math',
            location: 'Room 101',
            startDate: '2024-09-01',
            endDate: '2024-12-15',
            schedule: 'Mon/Wed 3:00 PM',
            maxStudents: 20,
            fee: -50,
        };

        const result = classSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('allows zero fee (free class)', () => {
        const validData = {
            name: 'Free Workshop',
            location: 'Room 101',
            startDate: '2024-09-01',
            endDate: '2024-12-15',
            schedule: 'Mon/Wed 3:00 PM',
            maxStudents: 20,
            fee: 0,
        };

        const result = classSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });
});

describe('enrollmentSchema', () => {
    it('validates correct enrollment data', () => {
        const validData = {
            studentId: '550e8400-e29b-41d4-a716-446655440000',
            classId: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = enrollmentSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects non-UUID student ID', () => {
        const invalidData = {
            studentId: 'not-a-uuid',
            classId: '550e8400-e29b-41d4-a716-446655440001',
        };

        const result = enrollmentSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });

    it('rejects non-UUID class ID', () => {
        const invalidData = {
            studentId: '550e8400-e29b-41d4-a716-446655440000',
            classId: 'not-a-uuid',
        };

        const result = enrollmentSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
    });
});
