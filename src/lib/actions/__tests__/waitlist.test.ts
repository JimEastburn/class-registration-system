import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { joinWaitlist, leaveWaitlist, getWaitlistPosition } from '../waitlist';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Waitlist Server Actions implementation', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnThis();
        const mockDelete = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();
        const mockOrder = vi.fn().mockReturnThis();
        const mockLimit = vi.fn().mockReturnThis();
        const mockNot = vi.fn().mockReturnThis();

        const fromObj = {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            eq: mockEq,
            single: mockSingle,
            select: mockSelect,
            order: mockOrder,
            limit: mockLimit,
            not: mockNot,
        };

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => fromObj),
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('joinWaitlist', () => {
        it('should return error if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
            const result = await joinWaitlist('class123', 'student123');
            expect(result.error).toContain('log in');
        });

        it('should return error if student not owned', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { parent_id: 'otherParent' }, error: null })
            });

            const result = await joinWaitlist('class123', 'student123');
            expect(result.error).toContain('denied');
        });

        it('should return error if class is not full', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });
            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { parent_id: 'parent123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { current_enrollment: 5, max_students: 10, status: 'active' }, error: null })
            });

            const result = await joinWaitlist('class123', 'student123');
            expect(result.error).toContain('available spots');
        });

        it('should join waitlist at next position', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { parent_id: 'parent123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { current_enrollment: 10, max_students: 10, status: 'active' }, error: null })
            });
            // Existing enrollment check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Existing waitlist check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Max position check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { position: 3 }, error: null })
            });

            const result = await joinWaitlist('class123', 'student123');

            expect(result).toEqual({ success: true, position: 4 });
            expect(mockSupabase.from).toHaveBeenCalledWith('waitlist');
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('should join waitlist at position 1 if waitlist is empty', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            // Student check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { parent_id: 'parent123' }, error: null })
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { current_enrollment: 10, max_students: 10, status: 'active' }, error: null })
            });
            // Existing enrollment check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Existing waitlist check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null })
            });
            // Max position check - empty waitlist
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await joinWaitlist('class123', 'student123');

            expect(result).toEqual({ success: true, position: 1 });
        });
    });

    describe('leaveWaitlist', () => {
        it('should update waitlist status to cancelled', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockUpdate });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await leaveWaitlist('wait123');

            expect(result).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith('parent_id', 'parent123');
        });
    });
});
