import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserRole,
  updateParentStatus,
  deleteUser,
  getSystemStats,
} from '@/lib/actions/admin';
import { revalidatePath } from 'next/cache';
import {
  seedFake,
  ADMIN_PROFILE,
  type SeedProfile,
  type SeedPayment,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));

// ── Seed data ───────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-123';
const TARGET_ID = 'user-456';

const targetProfile: SeedProfile = {
  id: TARGET_ID, first_name: 'Target', last_name: 'User', role: 'parent', email: 'target@test.com',
};

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: ADMIN_ID,
    data: {
      profiles: [ADMIN_PROFILE, targetProfile] as unknown as Record<string, unknown>[],
      classes: [],
      enrollments: [],
      payments: [],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Admin Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('updateUserRole', () => {
    it('allows admin to update user role', async () => {
      seed();
      const result = await updateUserRole(TARGET_ID, 'teacher');
      expect(result.success).toBe(true);
    });

    it('prevents self-demotion', async () => {
      seed();
      const result = await updateUserRole(ADMIN_ID, 'parent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot demote yourself');
    });

    it('denies non-admin', async () => {
      const fake = seedFake({
        authUserId: 'teacher-1',
        data: {
          profiles: [{ id: 'teacher-1', first_name: 'Teacher', last_name: 'User', role: 'teacher' }] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateUserRole(TARGET_ID, 'admin');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('deleteUser', () => {
    it('allows admin to delete user', async () => {
      const fake = seed();
      const result = await deleteUser(TARGET_ID);
      expect(result.success).toBe(true);
      expect(fake.db.profiles.filter((p) => p.id === TARGET_ID)).toHaveLength(0);
    });
  });

  describe('getSystemStats', () => {
    it('should return totalRevenue in dollars without dividing by 100', async () => {
      const payments: SeedPayment[] = [
        { id: 'pay-1', amount: 30, status: 'completed' },
        { id: 'pay-2', amount: 30, status: 'completed' },
      ];
      seed({
        profiles: [ADMIN_PROFILE, targetProfile] as unknown as Record<string, unknown>[],
        classes: [
          { id: 'c1', name: 'Art', price: 30, teacher_id: ADMIN_ID, status: 'published' },
          { id: 'c2', name: 'Music', price: 30, teacher_id: ADMIN_ID, status: 'published' },
        ],
        enrollments: [
          { id: 'e1', student_id: 's1', class_id: 'c1', status: 'confirmed' },
          { id: 'e2', student_id: 's2', class_id: 'c1', status: 'confirmed' },
          { id: 'e3', student_id: 's3', class_id: 'c2', status: 'confirmed' },
        ],
        payments: payments as unknown as Record<string, unknown>[],
      });

      const result = await getSystemStats();
      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        totalUsers: 2,
        totalClasses: 2,
        totalEnrollments: 3,
        totalRevenue: 60,
      });
      expect(result.data?.totalRevenue).not.toBe(0.6);
    });
  });

  describe('updateParentStatus', () => {
    it('allows admin to toggle is_parent', async () => {
      seed();
      const result = await updateParentStatus(TARGET_ID, true);
      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('denies non-admin users', async () => {
      const fake = seedFake({
        authUserId: 'teacher-1',
        data: {
          profiles: [{ id: 'teacher-1', first_name: 'Teacher', last_name: 'User', role: 'teacher' }] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateParentStatus(TARGET_ID, true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('denies unauthenticated users', async () => {
      seedFake({ authUserId: null });
      const result = await updateParentStatus(TARGET_ID, true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authenticated');
    });
  });
});
