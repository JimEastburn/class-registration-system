import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createEnrollment, cancelEnrollment } from '../actions/enrollments';
import { joinWaitlist } from '../actions/waitlist';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendEnrollmentConfirmation: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Capacity & Waitlist Hand-off Integration', () => {
    let mockSupabase: any;
    let stableBuilder: any;

    beforeEach(() => {
        vi.clearAllMocks();

        stableBuilder = {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => stableBuilder),
            not: vi.fn().mockImplementation(() => stableBuilder),
            order: vi.fn().mockImplementation(() => stableBuilder),
            limit: vi.fn().mockImplementation(() => stableBuilder),
            single: vi.fn().mockImplementation(() => {
                return Promise.resolve({ data: null, error: null });
            }),
            insert: vi.fn().mockReturnThis(),
        };

        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn().mockReturnValue(stableBuilder),
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should allow enrollment after a full class spot is vacated by cancellation', async () => {
        // 1. SETUP: Class is full (1/1)
        const classId = 'class_full_123';
        const studentA = 'student_waitlist_A';
        const parentId = 'parent_123';

        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: parentId } },
            error: null
        });

        // Mock class data: full
        const mockClassData = {
            id: classId,
            name: 'Full Class',
            status: 'active',
            max_students: 1,
            current_enrollment: 1,
            teacher: { first_name: 'Teacher', last_name: 'One' },
            teacher_id: 'teacher_123'
        };

        // 2. TRIAL: Student A tries to enroll directly -> Should fail
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'classes') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockClassData, error: null })
            };
            if (table === 'family_members') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: studentA, parent_id: parentId }, error: null })
            };
            return stableBuilder;
        });

        const directEnrollResult = await createEnrollment(studentA, classId);
        expect(directEnrollResult.error).toBe('Class is full');

        // 3. WAITLIST: Student A joins waitlist -> Should succeed
        const waitlistBuilder: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => waitlistBuilder),
            not: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null })
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'waitlist') return waitlistBuilder;
            if (table === 'classes') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockClassData, error: null })
            };
            if (table === 'family_members') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: studentA, parent_id: parentId }, error: null })
            };
            return stableBuilder;
        });

        const waitlistResult = await joinWaitlist(classId, studentA);
        expect(waitlistResult.success).toBe(true);
        expect(waitlistResult.position).toBe(1);

        // 4. ACTION: Another student's enrollment is cancelled
        const mockEnrollmentB = {
            id: 'enroll_B',
            status: 'confirmed',
            student: { parent_id: parentId }
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'enrollments') return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockEnrollmentB, error: null }),
                update: vi.fn().mockReturnThis(),
            };
            return stableBuilder;
        });

        const cancelResult = await cancelEnrollment('enroll_B');
        expect(cancelResult.success).toBe(true);

        // 5. HAND-OFF: Student A now tries to enroll again
        // We simulate that current_enrollment has decremented to 0
        const mockClassDataOpen = { ...mockClassData, current_enrollment: 0 };

        mockSupabase.from.mockImplementation((table: string) => {
            const builder: any = {
                select: vi.fn().mockImplementation(() => builder),
                eq: vi.fn().mockImplementation(() => builder),
                insert: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(() => {
                    if (table === 'classes') return Promise.resolve({ data: mockClassDataOpen, error: null });
                    if (table === 'family_members') return Promise.resolve({ data: { id: studentA, first_name: 'A', last_name: 'S', parent_id: parentId }, error: null });
                    if (table === 'profiles') return Promise.resolve({ data: { first_name: 'P', email: 'p@e.com' }, error: null });
                    return Promise.resolve({ data: null, error: null });
                })
            };
            return builder;
        });

        const finalEnrollResult = await createEnrollment(studentA, classId);
        expect(finalEnrollResult.success).toBe(true);
    });
});
