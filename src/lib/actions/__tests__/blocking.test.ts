import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { blockStudent, unblockStudent } from '../classes';
import { createEnrollment } from '../enrollments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendEnrollmentConfirmation: vi.fn(),
}));

describe('Blocking Server Actions', () => {
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
                delete: vi.fn().mockReturnThis(),
            })),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('blockStudent', () => {
        it('should return error if not authenticated', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });
            const result = await blockStudent('class1', 'student1', 'reason');
            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('should successfull block a student', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'teacher1' } }, error: null });

            mockSupabase.from.mockReturnValueOnce({
                insert: vi.fn().mockResolvedValue({ error: null })
            });

            const result = await blockStudent('class1', 'student1', 'Misbehavior');
            expect(result).toEqual({ success: true });
            expect(mockSupabase.from).toHaveBeenCalledWith('class_blocks');
            expect(revalidatePath).toHaveBeenCalledWith('/teacher/students');
        });
    });

    describe('unblockStudent', () => {
        it('should successfully unblock a student', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'teacher1' } }, error: null });

            mockSupabase.from.mockReturnValueOnce({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null })
                    })
                })
            });

            const result = await unblockStudent('class1', 'student1');
            expect(result).toEqual({ success: true });
        });
    });

    describe('createEnrollment with blocks', () => {
        it('should fail enrollment if student is blocked', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: { id: 'parent1' } }, error: null });

            // 1. Verify parent owns student
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'student1' }, error: null })
            });

            // 2. Fetch Class Data
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'class1',
                        status: 'active',
                        max_students: 10,
                        current_enrollment: 0
                    },
                    error: null
                })
            });

            // 3. Check Block Data - RETURN BLOCKED
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { reason: 'Banned' },
                    error: null
                })
            });

            const result = await createEnrollment('student1', 'class1');
            expect(result).toEqual({ error: 'Student is blocked from enrolling in this class' });
        });
    });
});
