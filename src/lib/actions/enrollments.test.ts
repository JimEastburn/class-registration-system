import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollStudent, updateDepositPaid } from '@/lib/actions/enrollments';
import { checkStudentScheduleConflict } from '@/lib/logic/scheduling';
import {
  seedFake,
  PARENT_PROFILE,
  TEACHER_PROFILE,
  type SeedFamilyMember,
  type SeedClass,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendEnrollmentConfirmation: vi.fn() }));
vi.mock('@/lib/logic/scheduling', () => ({
  checkStudentScheduleConflict: vi.fn().mockReturnValue(null),
}));

// ── Seed Data ───────────────────────────────────────────────────────────────

const PARENT_ID = PARENT_PROFILE.id;
const TEACHER_ID = TEACHER_PROFILE.id;
const CLASS_ID = 'class-1';
const CHILD_ID = 'child-1';

const mockMember: SeedFamilyMember = {
  id: CHILD_ID, parent_id: PARENT_ID,
  first_name: 'Kid', last_name: 'Test', email: 'kid@test.com', relationship: 'Student',
};

const mockClass: SeedClass = {
  id: CLASS_ID, name: 'Art 101', capacity: 10,
  teacher_id: TEACHER_ID, status: 'published',
  schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
};

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: PARENT_ID,
    data: {
      profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
      family_members: [mockMember] as unknown as Record<string, unknown>[],
      classes: [mockClass] as unknown as Record<string, unknown>[],
      enrollments: [],
      class_blocks: [],
      system_settings: [],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Enrollment Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkStudentScheduleConflict).mockReturnValue(null);
  });

  describe('enrollStudent', () => {
    it('enrolls successfully if space available', async () => {
      const fake = seed({
        enrollments: Array.from({ length: 5 }, (_, i) => ({
          id: `enr-${i}`, student_id: `other-${i}`, class_id: CLASS_ID, status: 'confirmed',
        })) as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
      const newEnrollment = fake.db.enrollments.find((e) => e.student_id === CHILD_ID);
      expect(newEnrollment).toBeDefined();
      expect(newEnrollment!.status).toBe('pending');
    });

    it('waitlists if class is full', async () => {
      seed({
        enrollments: Array.from({ length: 10 }, (_, i) => ({
          id: `enr-${i}`, student_id: `other-${i}`, class_id: CLASS_ID, status: 'confirmed',
        })) as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(1);
    });

    it('blocks enrollment if student is blocked', async () => {
      seed({
        class_blocks: [
          { id: 'block-1', teacher_id: TEACHER_ID, student_id: CHILD_ID },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(result.status).toBe('blocked');
      expect(result.error).toContain('blocked');
    });

    it('rejects enrollment when student has a schedule conflict', async () => {
      vi.mocked(checkStudentScheduleConflict).mockReturnValue({ id: 'other-class', name: 'Art 101' });
      seed({
        enrollments: [
          { id: 'enr-existing', student_id: CHILD_ID, class_id: 'other-class', status: 'confirmed' },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(result.status).toBe('schedule_conflict');
      expect(result.error).toContain('Schedule conflict');
      expect(result.error).toContain('Art 101');
      expect(result.error).toContain('Kid');
    });

    it('allows enrollment when existing class is on different day/block', async () => {
      seed({
        enrollments: [
          { id: 'enr-other', student_id: CHILD_ID, class_id: 'other-class', status: 'confirmed' },
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `enr-${i}`, student_id: `other-${i}`, class_id: CLASS_ID, status: 'confirmed',
          })),
        ] as unknown as Record<string, unknown>[],
        classes: [
          mockClass,
          {
            id: 'other-class', name: 'Music', capacity: 20,
            teacher_id: TEACHER_ID, price: 30, status: 'published',
            schedule_config: { day: 'Wednesday', block: 'Block 3', recurring: true },
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
    });
  });

  describe('updateDepositPaid', () => {
    it('returns error when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await updateDepositPaid('enrollment-1', true, CLASS_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when class not found', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
          classes: [],
        },
      });
      const result = await updateDepositPaid('enrollment-1', true, CLASS_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Class not found');
    });

    it('returns access denied when user is not teacher or admin', async () => {
      seed(); // parentProfile is auth user, not the teacher
      const result = await updateDepositPaid('enrollment-1', true, CLASS_ID);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('updates deposit_paid successfully when user is the teacher', async () => {
      const fake = seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            { id: 'enrollment-1', student_id: CHILD_ID, class_id: CLASS_ID, status: 'confirmed', deposit_paid: false },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateDepositPaid('enrollment-1', true, CLASS_ID);
      expect(result.success).toBe(true);
      expect(fake.db.enrollments.find((e) => e.id === 'enrollment-1')!.deposit_paid).toBe(true);
    });

    it('updates deposit_paid successfully when user is an admin', async () => {
      const fake = seedFake({
        authUserId: 'admin-user',
        data: {
          profiles: [
            { id: 'admin-user', first_name: 'Admin', last_name: 'User', role: 'admin' },
            TEACHER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            { id: 'enrollment-1', student_id: CHILD_ID, class_id: CLASS_ID, status: 'confirmed', deposit_paid: true },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateDepositPaid('enrollment-1', false, CLASS_ID);
      expect(result.success).toBe(true);
      expect(fake.db.enrollments.find((e) => e.id === 'enrollment-1')!.deposit_paid).toBe(false);
    });
  });
});
