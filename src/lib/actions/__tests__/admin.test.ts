import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { updateUserRole, deleteUser, adminUpdateClass, adminDeleteClass, adminUpdateEnrollment, adminDeleteEnrollment, adminUpdatePayment } from '../admin';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Admin Server Actions implementation', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();

        (createAdminClient as Mock).mockReturnValue({
            auth: {
                admin: {
                    updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
                },
            },
        });

        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnThis();
        const mockDelete = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();

        const fromObj = {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            eq: mockEq,
            single: mockSingle,
            select: mockSelect,
        };

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => fromObj),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('Authorization', () => {
        it('should return error if not admin', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'parent' } } },
                error: null
            });
            const result = await updateUserRole('user123', 'teacher');
            expect(result).toEqual({ error: 'Not authorized' });
        });
    });

    describe('updateUserRole', () => {
        it('should update role and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await updateUserRole('user123', 'teacher');

            expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
            expect(mockUpdate).toHaveBeenCalledWith('id', 'user123');
            expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
            expect(result).toEqual({ success: true });
        });

        it('should allow promoting a parent to class_scheduler', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'parent' }, error: null });
            const mockUpdate = vi.fn().mockResolvedValue({ error: null });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: mockSingle,
                        update: vi.fn().mockReturnValue({ eq: mockUpdate })
                    } as any;
                }
                return {} as any;
            });

            const result = await updateUserRole('user123', 'class_scheduler');

            expect(result).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should return error when promoting a teacher to class_scheduler', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null });

            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'profiles') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: mockSingle,
                    } as any;
                }
                return {} as any;
            });

            const result = await updateUserRole('user123', 'class_scheduler');

            expect(result).toEqual({ error: 'Only parents or admins can be assigned the Class Scheduler role.' });
        });
    });

    describe('deleteUser', () => {
        it('should not allow deleting own account and not trigger database delete', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'admin123', user_metadata: { role: 'admin' } } },
                error: null
            });

            const result = await deleteUser('admin123');
            expect(result).toEqual({ error: 'Cannot delete your own account' });
            expect(mockSupabase.from).not.toHaveBeenCalled();
        });

        it('should delete user and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'admin123', user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockDelete = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({ eq: mockDelete })
            });

            const result = await deleteUser('user456');

            expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
            expect(mockDelete).toHaveBeenCalledWith('id', 'user456');
            expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
            expect(result).toEqual({ success: true });
        });
    });

    describe('adminUpdateClass', () => {
        it('should update class and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await adminUpdateClass('class123', { name: 'Admin Updated' });

            expect(mockSupabase.from).toHaveBeenCalledWith('classes');
            expect(revalidatePath).toHaveBeenCalledWith('/admin/classes');
            expect(result).toEqual({ success: true });
        });
    });

    describe('adminUpdateEnrollment', () => {
        it('should update enrollment status', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await adminUpdateEnrollment('enroll123', 'confirmed');

            expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
            expect(revalidatePath).toHaveBeenCalledWith('/admin/enrollments');
            expect(result).toEqual({ success: true });
        });
    });

    describe('adminUpdatePayment', () => {
        it('should update payment status', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await adminUpdatePayment('pay123', 'completed');

            expect(mockSupabase.from).toHaveBeenCalledWith('payments');
            expect(revalidatePath).toHaveBeenCalledWith('/admin/payments');
            expect(result).toEqual({ success: true });
        });
    });
});
