import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserRole,
  updateParentStatus,
  deleteUser,
  getSystemStats,
} from '@/lib/actions/admin';
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
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null,
    });
    // Default to returning mockSupabase as generic DB client (for non-super_admin)
    (createAdminClient as any).mockResolvedValue(mockSupabase);
  });

  describe('updateUserRole', () => {
    it('allows admin to update user role', async () => {
      // Mock Admin Check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      });

      // Mock Update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await updateUserRole('user-456', 'teacher');
      expect(result.success).toBe(true);
    });

    it('prevents self-demotion', async () => {
      // Mock Admin Check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
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
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'teacher' }, error: null }),
          }),
        }),
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
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      });

      // Mock Delete
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await deleteUser('user-456');
      expect(result.success).toBe(true);
    });
  });

  describe('getSystemStats', () => {
    it('should return totalRevenue in dollars without dividing by 100', async () => {
      // Mock Admin Check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      });

      // Mock parallel queries: users, classes, enrollments, payments

      // users count
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          then: vi.fn((resolve: (v: { count: number; error: null }) => void) =>
            resolve({ count: 10, error: null })
          ),
        }),
      });
      // classes count
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          then: vi.fn((resolve: (v: { count: number; error: null }) => void) =>
            resolve({ count: 5, error: null })
          ),
        }),
      });
      // enrollments count (confirmed)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn(
              (resolve: (v: { count: number; error: null }) => void) =>
                resolve({ count: 3, error: null })
            ),
          }),
        }),
      });
      // payments — DB stores amount in DOLLARS
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            then: vi.fn(
              (
                resolve: (v: {
                  data: { amount: number }[];
                  error: null;
                }) => void
              ) =>
                resolve({
                  data: [{ amount: 30 }, { amount: 30 }],
                  error: null,
                })
            ),
          }),
        }),
      });

      const result = await getSystemStats();

      expect(result.error).toBeNull();
      expect(result.data?.totalRevenue).toBe(60); // $30 + $30 = $60, NOT $0.60
      expect(result.data?.totalRevenue).not.toBe(0.6);
    });
  });

  describe('updateParentStatus', () => {
    it('allows admin to toggle is_parent', async () => {
      // Mock Admin Check
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      });

      // Mock Update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await updateParentStatus('user-456', true);
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('denies non-admin users', async () => {
      // Mock Admin Check (returns teacher role)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { role: 'teacher' }, error: null }),
          }),
        }),
      });

      const result = await updateParentStatus('user-456', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('denies unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await updateParentStatus('user-456', true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });
});
