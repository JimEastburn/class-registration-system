import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserRole,
  updateParentStatus,
  updateVolunteerAdminStatus,
  updatePhotoConsentAdminStatus,
  getPhotoConsentActivityLog,
  getPhotoConsentRoster,
  deleteUser,
  getSystemStats,
  getAllUsers,
  getAuditLogs,
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
  id: TARGET_ID,
  first_name: 'Target',
  last_name: 'User',
  role: 'parent',
  email: 'target@test.com',
};

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: ADMIN_ID,
    data: {
      profiles: [ADMIN_PROFILE, targetProfile] as unknown as Record<
        string,
        unknown
      >[],
      classes: [],
      enrollments: [],
      payments: [],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Admin Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
          profiles: [
            {
              id: 'teacher-1',
              first_name: 'Teacher',
              last_name: 'User',
              role: 'teacher',
            },
          ] as unknown as Record<string, unknown>[],
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
      expect(fake.db.profiles.filter((p) => p.id === TARGET_ID)).toHaveLength(
        0
      );
    });
  });

  describe('getSystemStats', () => {
    it('should return totalRevenue in dollars without dividing by 100', async () => {
      const payments: SeedPayment[] = [
        { id: 'pay-1', amount: 30, status: 'completed' },
        { id: 'pay-2', amount: 30, status: 'completed' },
      ];
      seed({
        profiles: [ADMIN_PROFILE, targetProfile] as unknown as Record<
          string,
          unknown
        >[],
        classes: [
          {
            id: 'c1',
            name: 'Art',
            price: 30,
            teacher_id: ADMIN_ID,
            status: 'published',
          },
          {
            id: 'c2',
            name: 'Music',
            price: 30,
            teacher_id: ADMIN_ID,
            status: 'published',
          },
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
          profiles: [
            {
              id: 'teacher-1',
              first_name: 'Teacher',
              last_name: 'User',
              role: 'teacher',
            },
          ] as unknown as Record<string, unknown>[],
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

  describe('updateVolunteerAdminStatus', () => {
    it('lets an admin grant additive volunteer administration access', async () => {
      const fake = seed();

      const result = await updateVolunteerAdminStatus(TARGET_ID, true);

      expect(result.success).toBe(true);
      expect(
        fake.db.profiles.find((profile) => profile.id === TARGET_ID)
      ).toMatchObject({ role: 'parent', is_volunteer_admin: true });
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('denies non-admin users', async () => {
      seedFake({
        authUserId: 'teacher-1',
        data: {
          profiles: [
            {
              id: 'teacher-1',
              first_name: 'Teacher',
              last_name: 'User',
              role: 'teacher',
            },
          ],
        },
      });

      const result = await updateVolunteerAdminStatus(TARGET_ID, true);

      expect(result).toMatchObject({ success: false, error: 'Unauthorized' });
    });
  });

  describe('updatePhotoConsentAdminStatus', () => {
    it('lets an admin grant additive photo consent administration access', async () => {
      const fake = seed();

      const result = await updatePhotoConsentAdminStatus(TARGET_ID, true);

      expect(result.success).toBe(true);
      expect(
        fake.db.profiles.find((profile) => profile.id === TARGET_ID)
      ).toMatchObject({ role: 'parent', is_photo_consent_admin: true });
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    });

    it('denies non-admin users', async () => {
      seedFake({
        authUserId: 'teacher-1',
        data: {
          profiles: [
            {
              id: 'teacher-1',
              first_name: 'Teacher',
              last_name: 'User',
              role: 'teacher',
            },
          ],
        },
      });

      const result = await updatePhotoConsentAdminStatus(TARGET_ID, true);

      expect(result).toMatchObject({ success: false, error: 'Unauthorized' });
    });
  });

  describe('getPhotoConsentRoster', () => {
    it('allows a delegated photo consent administrator to view student consent', async () => {
      seedFake({
        authUserId: TARGET_ID,
        data: {
          profiles: [
            {
              ...targetProfile,
              is_photo_consent_admin: true,
            },
            {
              id: 'parent-2',
              first_name: 'Family',
              last_name: 'Parent',
              email: 'family@example.com',
              role: 'parent',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [
            {
              id: 'student-1',
              parent_id: 'parent-2',
              first_name: 'Student',
              last_name: 'One',
              email: 'student@example.com',
              relationship: 'Student',
              grade: 'elementary',
              photo_consent: true,
            },
          ],
        },
      });

      const result = await getPhotoConsentRoster();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'student-1',
          studentName: 'Student One',
          parentName: 'Family Parent',
          parentEmail: 'family@example.com',
          photoConsent: true,
        }),
      ]);
    });

    it('denies users without admin role or delegated access', async () => {
      seedFake({
        authUserId: TARGET_ID,
        data: {
          profiles: [targetProfile] as unknown as Record<string, unknown>[],
          family_members: [],
        },
      });

      const result = await getPhotoConsentRoster();

      expect(result).toEqual({ data: null, error: 'Unauthorized' });
    });
  });

  describe('getPhotoConsentActivityLog', () => {
    it('allows a delegated photo consent administrator to view consent history', async () => {
      seedFake({
        authUserId: TARGET_ID,
        data: {
          profiles: [
            {
              ...targetProfile,
              is_photo_consent_admin: true,
            },
          ] as unknown as Record<string, unknown>[],
          photo_consent_activity_log: [
            {
              id: 'activity-1',
              action: 'consent',
              parent_id: 'parent-1',
              student_id: 'student-1',
              parent_name: 'Family Parent',
              student_name: 'Student One',
              created_at: '2026-08-30T12:00:00Z',
            },
            {
              id: 'activity-2',
              action: 'removed_consent',
              parent_id: 'parent-1',
              student_id: 'student-1',
              parent_name: 'Family Parent',
              student_name: 'Student One',
              created_at: '2026-08-30T13:00:00Z',
            },
          ],
        },
      });

      const result = await getPhotoConsentActivityLog(1);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        limit: 20,
      });
      expect(result.data?.entries[0]).toMatchObject({
        action: 'removed_consent',
        parent_name: 'Family Parent',
        student_name: 'Student One',
      });
    });

    it('denies users without admin role or delegated access', async () => {
      seedFake({
        authUserId: TARGET_ID,
        data: {
          profiles: [targetProfile] as unknown as Record<string, unknown>[],
          photo_consent_activity_log: [],
        },
      });

      const result = await getPhotoConsentActivityLog();

      expect(result).toEqual({ data: null, error: 'Unauthorized' });
    });
  });

  describe('getAllUsers', () => {
    it('excludes banned users from results', async () => {
      const bannedProfile: SeedProfile = {
        id: 'banned-user',
        first_name: 'Banned',
        last_name: 'User',
        role: 'parent',
        email: 'banned@test.com',
      };

      seed({
        profiles: [
          ADMIN_PROFILE,
          targetProfile,
          { ...bannedProfile, is_banned: true },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await getAllUsers(1, 20);
      expect(result.error).toBeNull();
      // Should exclude the banned user — only ADMIN_PROFILE and targetProfile
      expect(result.data).toHaveLength(2);
      expect(result.data?.find((u) => u.id === 'banned-user')).toBeUndefined();
      expect(result.count).toBe(2);
    });
  });

  describe('getAuditLogs', () => {
    it('joins the actor profile and filters by the actor name', async () => {
      seed({
        audit_logs: [
          {
            id: 'audit-target',
            user_id: TARGET_ID,
            action: 'update_role',
            target_type: 'profile',
            target_id: 'another-user',
            details: { newRole: 'teacher' },
            created_at: '2026-08-31T15:00:00.000Z',
          },
          {
            id: 'audit-admin',
            user_id: ADMIN_ID,
            action: 'class.created',
            target_type: 'class',
            target_id: 'class-1',
            details: { name: 'Art' },
            created_at: '2026-08-31T14:00:00.000Z',
          },
        ],
      });

      const result = await getAuditLogs(1, 20, { actor: 'Target User' });

      expect(result.error).toBeNull();
      expect(result.count).toBe(1);
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'audit-target',
          profiles: expect.objectContaining({
            first_name: 'Target',
            last_name: 'User',
            email: 'target@test.com',
          }),
        }),
      ]);
    });

    it('returns an empty page when no actor matches', async () => {
      seed({ audit_logs: [] });

      const result = await getAuditLogs(1, 20, { actor: 'Nobody Here' });

      expect(result).toEqual({ data: [], count: 0, error: null });
    });

    it('filters actions using the human-readable text shown in the table', async () => {
      seed({
        audit_logs: [
          {
            id: 'audit-status',
            user_id: ADMIN_ID,
            action: 'UPDATE_ENROLLMENT_STATUS',
            target_type: 'enrollment',
            target_id: 'enrollment-1',
            details: null,
            created_at: '2026-08-31T15:00:00.000Z',
          },
          {
            id: 'audit-class',
            user_id: ADMIN_ID,
            action: 'class.created',
            target_type: 'class',
            target_id: 'class-1',
            details: null,
            created_at: '2026-08-31T14:00:00.000Z',
          },
        ],
      });

      const result = await getAuditLogs(1, 20, { action: 'Class created' });

      expect(result.error).toBeNull();
      expect(result.count).toBe(1);
      expect(result.data?.map((log) => log.id)).toEqual(['audit-class']);
    });
  });
});
