
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUserRole, deleteUser } from '@/lib/actions/admin';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
    logAuditAction: vi.fn(),
}));

describe('Admin Actions', () => {
    const mockAdminUser = { id: 'admin-123' };
    const mockTargetUser = { id: 'user-456' };

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as any).mockResolvedValue(mockSupabase);
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser }, error: null });
        // Default to returning mockSupabase as generic DB client (for non-super_admin)
        (createAdminClient as any).mockResolvedValue(mockSupabase);
    });

    describe('updateUserRole', () => {
        it('allows admin to update user role', async () => {
            // Mock Admin Check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
                    })
                })
            });

            // Mock Update
            mockSupabase.from.mockReturnValueOnce({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null })
                })
            });

            const result = await updateUserRole('user-456', 'teacher');
            expect(result.success).toBe(true);
        });

        it('prevents self-demotion', async () => {
             // Mock Admin Check
             mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
                    })
                })
            });

            const result = await updateUserRole('admin-123', 'parent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('cannot demote yourself');
        });

        it('denies non-admin', async () => {
            // Mock Admin Check (returns teacher role)
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                    })
                })
            });

            const result = await updateUserRole('user-456', 'admin');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Unauthorized');
        });
    });

     describe('deleteUser', () => {
        it('allows admin to delete user', async () => {
             // Mock Admin Check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null })
                    })
                })
            });

            // Mock Delete
            mockSupabase.from.mockReturnValueOnce({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null })
                })
            });

            const result = await deleteUser('user-456');
            expect(result.success).toBe(true);
        });
     });
});
