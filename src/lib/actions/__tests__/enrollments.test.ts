import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { createEnrollment, cancelEnrollment, confirmEnrollment } from '../enrollments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendEnrollmentConfirmation } from '@/lib/email';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendEnrollmentConfirmation: vi.fn(),
}));

describe('Enrollment Server Actions implementation', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn(),
                insert: vi.fn(),
                update: vi.fn().mockReturnThis(),
            })),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('createEnrollment', () => {
        it('should return error if not authenticated', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });
            const result = await createEnrollment('student123', 'class123');
            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('should return error if student not found or not owned', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await createEnrollment('student123', 'class123');
            expect(result).toEqual({ error: 'Student not found' });
        });

        it('should return error if class not found', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'student123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await createEnrollment('student123', 'class123');
            expect(result).toEqual({ error: 'Class not found' });
        });

        it('should return error if class is not active', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'student123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'cancelled' }, error: null })
            });

            const result = await createEnrollment('student123', 'class123');
            expect(result).toEqual({ error: 'Class is not accepting enrollments' });
        });

        it('should return error if class is full', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'student123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'active', current_enrollment: 10, max_students: 10 }, error: null })
            });
             // Blocked check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await createEnrollment('student123', 'class123');
            expect(result).toEqual({ error: 'Class is full' });
        });

        it('should create enrollment and send email', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'student123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'class123', name: 'Art', status: 'active',
                        current_enrollment: 5, max_students: 10,
                        schedule: 'Mon 3pm', location: 'Room 1',
                        start_date: '2024-01-01', fee: 100,
                        teacher: { first_name: 'Bob', last_name: 'Smith' }
                    },
                    error: null
                })
            });
            // Blocked check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Existing enrollment check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Insert enrollment
            mockSupabase.from.mockReturnValueOnce({
                insert: vi.fn().mockResolvedValue({ error: null })
            });
            // Student data for email
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { first_name: 'Alice', last_name: 'Doe' }, error: null })
            });
            // Profile data for email
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { first_name: 'John', email: 'parent@test.com' }, error: null })
            });

            const result = await createEnrollment('student123', 'class123');

            expect(result).toEqual({ success: true });
            expect(sendEnrollmentConfirmation).toHaveBeenCalled();
            expect(revalidatePath).toHaveBeenCalledWith('/parent/enrollments');
        });
    });

    describe('cancelEnrollment', () => {
        it('should return error if not authorized', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'enroll123', student: { parent_id: 'otherParent' } },
                    error: null
                })
            });

            const result = await cancelEnrollment('enroll123');
            expect(result).toEqual({ error: 'Not authorized' });
        });

        it('should update status to cancelled', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'enroll123', student: { parent_id: 'parent123' }, status: 'confirmed' },
                    error: null
                })
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValueOnce({
                update: vi.fn().mockReturnValue({
                    eq: mockUpdate
                })
            });

            const result = await cancelEnrollment('enroll123');

            expect(result).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith('id', 'enroll123');
            expect(revalidatePath).toHaveBeenCalledWith('/parent/enrollments');
        });
    });

    describe('confirmEnrollment', () => {
        it('should update status to confirmed', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'enroll123', student: { parent_id: 'parent123' }, status: 'pending' },
                    error: null
                })
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValueOnce({
                update: vi.fn().mockReturnValue({
                    eq: mockUpdate
                })
            });

            const result = await confirmEnrollment('enroll123');

            expect(result).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith('id', 'enroll123');
            expect(revalidatePath).toHaveBeenCalledWith('/parent/enrollments');
        });
    });
});
