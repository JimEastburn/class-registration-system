import { describe, it, expect } from 'vitest';
import { enrollmentSchema, registerSchema, familyMemberSchema } from '../validations';

describe('Student-Related Validations', () => {
    describe('enrollmentSchema', () => {
        it('should validate correct UUIDs', () => {
            const validData = {
                studentId: '550e8400-e29b-41d7-a716-446655440000',
                classId: '550e8400-e29b-41d7-a716-446655440001'
            };
            const result = enrollmentSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should fail with invalid UUIDs', () => {
            const invalidData = {
                studentId: 'not-a-uuid',
                classId: '550e8400-e29b-41d7-a716-446655440001'
            };
            const result = enrollmentSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('Please select a student');
            }
        });

        it('should fail with missing fields', () => {
            const result = enrollmentSchema.safeParse({ studentId: '550e8400-e29b-41d7-a716-446655440000' });
            expect(result.success).toBe(false);
        });
    });

    describe('registerSchema (Student Role)', () => {
        const validStudent = {
            email: 'student@example.com',
            password: 'Password123',
            confirmPassword: 'Password123',
            firstName: 'Demo',
            lastName: 'Student',
            role: 'student' as const,
            codeOfConduct: true
        };

        it('should validate a valid student registration', () => {
            const result = registerSchema.safeParse(validStudent);
            expect(result.success).toBe(true);
        });

        it('should fail if passwords do not match', () => {
            const result = registerSchema.safeParse({
                ...validStudent,
                confirmPassword: 'DifferentPassword123'
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some(i => i.message === 'Passwords do not match')).toBe(true);
            }
        });

        it('should fail if password does not meet requirements', () => {
            const result = registerSchema.safeParse({
                ...validStudent,
                password: 'weak',
                confirmPassword: 'weak'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('familyMemberSchema gradeLevel', () => {
        it('should allow valid grade levels', () => {
            const validChild = {
                firstName: 'Child',
                lastName: 'Test',
                relationship: 'child' as const,
                gradeLevel: 'high school' as const
            };
            const result = familyMemberSchema.safeParse(validChild);
            expect(result.success).toBe(true);
        });

        it('should fail on invalid grade levels', () => {
            const invalidChild = {
                firstName: 'Child',
                lastName: 'Test',
                relationship: 'child' as const,
                gradeLevel: '5' // Not in enum
            };
            const result = familyMemberSchema.safeParse(invalidChild);
            expect(result.success).toBe(false);
        });
    });
});
