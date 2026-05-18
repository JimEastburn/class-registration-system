import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enrollStudent,
  updateDepositPaid,
  cancelEnrollment,
  adminCancelEnrollment,
  teacherCancelEnrollment,
  adminEnrollStudent,
  getAdminEnrollmentStudentOptions,
  getAdminEnrollmentClassOptions,
  adminRemoveEnrollment,
} from '@/lib/actions/enrollments';
import { promoteFromWaitlist } from '@/lib/actions/waitlist';
import { checkStudentScheduleConflict } from '@/lib/logic/scheduling';
import { logAuditAction } from '@/lib/actions/audit';
import { sendEnrollmentCancellation } from '@/lib/email';
import {
  seedFake,
  PARENT_PROFILE,
  TEACHER_PROFILE,
  ADMIN_PROFILE,
  SCHEDULER_PROFILE,
  type SeedFamilyMember,
  type SeedClass,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email', () => ({
  sendEnrollmentConfirmation: vi.fn(),
  sendEnrollmentCancellation: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/lib/actions/waitlist', () => ({
  promoteFromWaitlist: vi.fn().mockResolvedValue({ success: true, data: null }),
}));
vi.mock('@/lib/logic/scheduling', () => ({
  checkStudentScheduleConflict: vi.fn().mockReturnValue(null),
}));

// ── Seed Data ───────────────────────────────────────────────────────────────

const PARENT_ID = PARENT_PROFILE.id;
const TEACHER_ID = TEACHER_PROFILE.id;
const CLASS_ID = 'class-1';
const CHILD_ID = 'child-1';

const mockMember: SeedFamilyMember = {
  id: CHILD_ID,
  parent_id: PARENT_ID,
  first_name: 'Kid',
  last_name: 'Test',
  email: 'kid@test.com',
  relationship: 'Student',
};

const mockClass: SeedClass = {
  id: CLASS_ID,
  name: 'Art 101',
  capacity: 10,
  teacher_id: TEACHER_ID,
  status: 'published',
  schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
};

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: PARENT_ID,
    data: {
      profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
        string,
        unknown
      >[],
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
          id: `enr-${i}`,
          student_id: `other-${i}`,
          class_id: CLASS_ID,
          status: 'confirmed',
        })) as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
      const newEnrollment = fake.db.enrollments.find(
        (e) => e.student_id === CHILD_ID
      );
      expect(newEnrollment).toBeDefined();
      expect(newEnrollment!.status).toBe('pending');
    });

    it('waitlists if class is full', async () => {
      seed({
        enrollments: Array.from({ length: 10 }, (_, i) => ({
          id: `enr-${i}`,
          student_id: `other-${i}`,
          class_id: CLASS_ID,
          status: 'confirmed',
        })) as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(1);
    });

    it('waitlists if class is full with pending enrollments', async () => {
      seed({
        enrollments: Array.from({ length: 10 }, (_, i) => ({
          id: `enr-${i}`,
          student_id: `other-${i}`,
          class_id: CLASS_ID,
          status: 'pending',
        })) as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(1);
    });

    it('blocks enrollment if student is blocked', async () => {
      seed({
        class_blocks: [
          { id: 'block-1', teacher_id: TEACHER_ID, student_id: CHILD_ID },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('blocked');
      expect(result.error).toContain('blocked');
    });

    it('rejects enrollment when student has a schedule conflict', async () => {
      vi.mocked(checkStudentScheduleConflict).mockReturnValue({
        id: 'other-class',
        name: 'Art 101',
      });
      seed({
        enrollments: [
          {
            id: 'enr-existing',
            student_id: CHILD_ID,
            class_id: 'other-class',
            status: 'confirmed',
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('schedule_conflict');
      expect(result.error).toContain('Schedule conflict');
      expect(result.error).toContain('Art 101');
      expect(result.error).toContain('Kid');
    });

    it('allows enrollment when existing class is on different day/block', async () => {
      seed({
        enrollments: [
          {
            id: 'enr-other',
            student_id: CHILD_ID,
            class_id: 'other-class',
            status: 'confirmed',
          },
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `enr-${i}`,
            student_id: `other-${i}`,
            class_id: CLASS_ID,
            status: 'confirmed',
          })),
        ] as unknown as Record<string, unknown>[],
        classes: [
          mockClass,
          {
            id: 'other-class',
            name: 'Music',
            capacity: 20,
            teacher_id: TEACHER_ID,
            price: 30,
            status: 'published',
            schedule_config: {
              day: 'Wednesday',
              block: 'Block 3',
              recurring: true,
            },
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
    });
  });

  describe('cancelEnrollment', () => {
    it('calls promoteFromWaitlist after cancelling a pending enrollment', async () => {
      seedFake({
        authUserId: 'admin-user',
        data: {
          profiles: [
            {
              id: 'admin-user',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
            },
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-to-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await cancelEnrollment('enr-to-cancel');
      expect(result.success).toBe(true);
      expect(promoteFromWaitlist).toHaveBeenCalledWith(CLASS_ID);
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
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enrollment-1',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
              deposit_paid: false,
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateDepositPaid('enrollment-1', true, CLASS_ID);
      expect(result.success).toBe(true);
      expect(
        fake.db.enrollments.find((e) => e.id === 'enrollment-1')!.deposit_paid
      ).toBe(true);
    });

    it('updates deposit_paid successfully when user is an admin', async () => {
      const fake = seedFake({
        authUserId: 'admin-user',
        data: {
          profiles: [
            {
              id: 'admin-user',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
            },
            TEACHER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enrollment-1',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
              deposit_paid: true,
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await updateDepositPaid('enrollment-1', false, CLASS_ID);
      expect(result.success).toBe(true);
      expect(
        fake.db.enrollments.find((e) => e.id === 'enrollment-1')!.deposit_paid
      ).toBe(false);
    });
  });

  describe('adminCancelEnrollment', () => {
    const ADMIN_ID = 'admin-user';

    it('calls promoteFromWaitlist after cancelling without refund', async () => {
      seedFake({
        authUserId: ADMIN_ID,
        data: {
          profiles: [
            {
              id: ADMIN_ID,
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
            },
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-admin-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });

      const result = await adminCancelEnrollment('enr-admin-cancel', {
        refund: false,
      });
      expect(result.success).toBe(true);
      expect(promoteFromWaitlist).toHaveBeenCalledWith(CLASS_ID);
    });
  });

  describe('adminEnrollStudent', () => {
    const SUPER_ADMIN_PROFILE_FIXTURE = {
      id: 'super-admin-123',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      email: 'super@test.com',
    };

    const STUDENT_MEMBER: SeedFamilyMember = {
      id: 'student-1',
      parent_id: PARENT_ID,
      first_name: 'Student',
      last_name: 'One',
      email: 'student1@test.com',
      relationship: 'Student',
    };

    const NON_STUDENT_MEMBER: SeedFamilyMember = {
      id: 'non-student-1',
      parent_id: PARENT_ID,
      first_name: 'Parent',
      last_name: 'Member',
      email: 'parentmember@test.com',
      relationship: 'Parent',
    };

    const ADMIN_CLASS: SeedClass = {
      id: 'admin-class-1',
      name: 'Admin Art 101',
      capacity: 3,
      teacher_id: TEACHER_ID,
      status: 'published',
      schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(checkStudentScheduleConflict).mockReturnValue(null);
    });

    it('rejects unauthenticated user', async () => {
      seedFake({ authUserId: null });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });

    it('rejects parent', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });

    it('rejects teacher', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });

    it('rejects class_scheduler', async () => {
      seedFake({
        authUserId: SCHEDULER_PROFILE.id,
        data: {
          profiles: [
            PARENT_PROFILE,
            TEACHER_PROFILE,
            SCHEDULER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });

    it('rejects non-student family member', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [NON_STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: NON_STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toBe('Only students can be enrolled in classes');
    });

    it('admin creates pending enrollment when room exists', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.error).toBeNull();
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
      const enrollment = fake.db.enrollments.find(
        (e) => e.student_id === STUDENT_MEMBER.id
      );
      expect(enrollment).toBeDefined();
      expect(enrollment!.status).toBe('pending');
    });

    it('super_admin creates pending enrollment', async () => {
      const fake = seedFake({
        authUserId: SUPER_ADMIN_PROFILE_FIXTURE.id,
        data: {
          profiles: [
            SUPER_ADMIN_PROFILE_FIXTURE,
            TEACHER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.error).toBeNull();
      expect(result.status).toBe('pending');
      const enrollment = fake.db.enrollments.find(
        (e) => e.student_id === STUDENT_MEMBER.id
      );
      expect(enrollment).toBeDefined();
      expect(enrollment!.status).toBe('pending');
    });

    it('creates waitlisted enrollment when class is full', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [
            {
              id: 'enr-1',
              student_id: 'other-1',
              class_id: ADMIN_CLASS.id,
              status: 'confirmed',
            },
            {
              id: 'enr-2',
              student_id: 'other-2',
              class_id: ADMIN_CLASS.id,
              status: 'pending',
            },
            {
              id: 'enr-3',
              student_id: 'other-3',
              class_id: ADMIN_CLASS.id,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.error).toBeNull();
      expect(result.status).toBe('waitlisted');
      const enrollment = fake.db.enrollments.find(
        (e) => e.student_id === STUDENT_MEMBER.id
      );
      expect(enrollment).toBeDefined();
      expect(enrollment!.status).toBe('waitlisted');
      expect(enrollment!.waitlist_position).toBe(1);
    });

    it('rejects blocked student', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          class_blocks: [
            {
              id: 'block-1',
              teacher_id: TEACHER_ID,
              student_id: STUDENT_MEMBER.id,
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.status).toBe('blocked');
      expect(result.error).toContain('blocked');
    });

    it('rejects schedule conflict', async () => {
      vi.mocked(checkStudentScheduleConflict).mockReturnValue({
        id: 'other-class',
        name: 'Dance 101',
      });
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [
            ADMIN_CLASS,
            {
              id: 'other-class',
              name: 'Dance 101',
              capacity: 10,
              teacher_id: TEACHER_ID,
              status: 'published',
              schedule_config: {
                day: 'Tuesday',
                block: 'Block 1',
                recurring: true,
              },
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [
            {
              id: 'enr-existing',
              student_id: STUDENT_MEMBER.id,
              class_id: 'other-class',
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.status).toBe('schedule_conflict');
      expect(result.error).toContain('Schedule conflict');
    });

    it('rejects active duplicate enrollment', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [
            {
              id: 'enr-existing',
              student_id: STUDENT_MEMBER.id,
              class_id: ADMIN_CLASS.id,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.data).toBeNull();
      expect(result.error).toContain('already enrolled');
    });

    it('reactivates cancelled enrollment instead of creating duplicate', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [
            {
              id: 'enr-cancelled',
              student_id: STUDENT_MEMBER.id,
              class_id: ADMIN_CLASS.id,
              status: 'cancelled',
              waitlist_position: null,
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.error).toBeNull();
      expect(result.status).toBe('reactivated');
      const enrollment = fake.db.enrollments.find(
        (e) => e.id === 'enr-cancelled'
      );
      expect(enrollment).toBeDefined();
      expect(enrollment!.status).toBe('pending');
    });

    it('logs audit action and revalidates paths on success', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [ADMIN_CLASS] as unknown as Record<string, unknown>[],
          family_members: [STUDENT_MEMBER] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [],
        },
      });
      const result = await adminEnrollStudent({
        studentId: STUDENT_MEMBER.id,
        classId: ADMIN_CLASS.id,
      });
      expect(result.error).toBeNull();
      expect(logAuditAction).toHaveBeenCalledWith(
        ADMIN_PROFILE.id,
        'admin_enroll_student',
        'enrollment',
        expect.any(String),
        expect.objectContaining({
          classId: ADMIN_CLASS.id,
          studentId: STUDENT_MEMBER.id,
        })
      );
    });
  });

  describe('getAdminEnrollmentStudentOptions', () => {
    it('returns students for admin', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [
            {
              id: 's1',
              parent_id: PARENT_ID,
              first_name: 'Alice',
              last_name: 'Smith',
              email: 'alice@test.com',
              relationship: 'Student',
            },
            {
              id: 's2',
              parent_id: PARENT_ID,
              first_name: 'Bob',
              last_name: 'Jones',
              email: 'bob@test.com',
              relationship: 'Student',
            },
            {
              id: 'p1',
              parent_id: PARENT_ID,
              first_name: 'Mom',
              last_name: 'Smith',
              email: 'mom@test.com',
              relationship: 'Parent',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await getAdminEnrollmentStudentOptions();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data!.map((s) => s.id)).toContain('s1');
      expect(result.data!.map((s) => s.id)).toContain('s2');
    });

    it('returns parent_name when a parent profile is present', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [
            ADMIN_PROFILE,
            {
              id: PARENT_ID,
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@test.com',
              role: 'parent',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [
            {
              id: 's1',
              parent_id: PARENT_ID,
              first_name: 'Alice',
              last_name: 'Smith',
              email: 'alice@test.com',
              relationship: 'Student',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await getAdminEnrollmentStudentOptions();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].parent_name).toBe('John Doe');
    });

    it('uses explicit family_members_parent_id_fkey FK hint in the select string', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [],
        },
      });

      let capturedSelect: string | null = null;
      const originalFrom = fake.from.bind(fake);
      fake.from = vi.fn((table: string) => {
        const qb = originalFrom(table);
        const originalSelect = qb.select.bind(qb);
        qb.select = vi.fn((query?: string, opts?: unknown) => {
          capturedSelect = query ?? null;
          return originalSelect(query, opts);
        });
        return qb;
      }) as unknown as typeof fake.from;

      await getAdminEnrollmentStudentOptions();

      expect(fake.from).toHaveBeenCalledWith('family_members');
      expect(capturedSelect).toContain('!family_members_parent_id_fkey');
    });

    it('filters students by search query', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [
            {
              id: 's1',
              parent_id: PARENT_ID,
              first_name: 'Alice',
              last_name: 'Smith',
              email: 'alice@test.com',
              relationship: 'Student',
            },
            {
              id: 's2',
              parent_id: PARENT_ID,
              first_name: 'Bob',
              last_name: 'Jones',
              email: 'bob@test.com',
              relationship: 'Student',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await getAdminEnrollmentStudentOptions('Bob');
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('s2');
    });

    it('rejects non-admin users', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [],
        },
      });
      const result = await getAdminEnrollmentStudentOptions();
      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });
  });

  describe('getAdminEnrollmentClassOptions', () => {
    it('returns published classes for admin', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [
            {
              id: 'c1',
              name: 'Art 101',
              teacher_id: TEACHER_ID,
              status: 'published',
            },
            {
              id: 'c2',
              name: 'Draft Class',
              teacher_id: TEACHER_ID,
              status: 'draft',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await getAdminEnrollmentClassOptions();
      expect(result.error).toBeNull();
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('filters classes by search query', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [
            {
              id: 'c1',
              name: 'Art 101',
              teacher_id: TEACHER_ID,
              status: 'published',
            },
            {
              id: 'c2',
              name: 'Music 202',
              teacher_id: TEACHER_ID,
              status: 'published',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await getAdminEnrollmentClassOptions('Music');
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('c2');
    });

    it('rejects non-admin users', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          classes: [],
        },
      });
      const result = await getAdminEnrollmentClassOptions();
      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });
  });

  describe('teacherCancelEnrollment', () => {
    const OTHER_TEACHER_ID = 'other-teacher';

    it('rejects unauthenticated user', async () => {
      seedFake({ authUserId: null });
      const result = await teacherCancelEnrollment('enr-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('rejects non-teacher non-admin user', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('rejects teacher who does not own the class', async () => {
      seedFake({
        authUserId: OTHER_TEACHER_ID,
        data: {
          profiles: [
            {
              id: OTHER_TEACHER_ID,
              first_name: 'Other',
              last_name: 'Teacher',
              role: 'teacher',
            },
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied: You are not the teacher of this class');
    });

    it('returns error if enrollment already cancelled', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'cancelled',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Enrollment is already cancelled');
    });

    it('cancels enrollment when user is the teacher', async () => {
      const fake = seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [
            TEACHER_PROFILE,
            PARENT_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(true);
      const enrollment = fake.db.enrollments.find(
        (e) => e.id === 'enr-teacher-cancel'
      );
      expect(enrollment!.status).toBe('cancelled');
      expect(promoteFromWaitlist).toHaveBeenCalledWith(CLASS_ID);
    });

    it('cancels enrollment when user is an admin', async () => {
      const fake = seedFake({
        authUserId: 'admin-user',
        data: {
          profiles: [
            {
              id: 'admin-user',
              first_name: 'Admin',
              last_name: 'User',
              role: 'admin',
            },
            TEACHER_PROFILE,
            PARENT_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(true);
      const enrollment = fake.db.enrollments.find(
        (e) => e.id === 'enr-teacher-cancel'
      );
      expect(enrollment!.status).toBe('cancelled');
    });

    it('returns error when enrollment not found', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('nonexistent-enr');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Enrollment not found');
    });

    it('rejects when enrollment has a completed payment', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [TEACHER_PROFILE, PARENT_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          payments: [
            {
              id: 'pay-1',
              enrollment_id: 'enr-teacher-cancel',
              status: 'completed',
              amount: 50,
              parent_id: PARENT_ID,
            },
          ] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Cannot cancel a paid enrollment — please ask an admin to issue a refund'
      );
    });

    it('sends cancellation email to parent on success', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [
            TEACHER_PROFILE,
            PARENT_PROFILE,
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-teacher-cancel',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
        },
      });
      const result = await teacherCancelEnrollment('enr-teacher-cancel');
      expect(result.success).toBe(true);
      expect(sendEnrollmentCancellation).toHaveBeenCalledWith(
        expect.objectContaining({
          parentEmail: PARENT_PROFILE.email,
          studentName: 'Kid Test',
          className: 'Art 101',
        })
      );
    });
  });

  describe('adminRemoveEnrollment', () => {
    it('rejects hard delete in production', async () => {
      const originalEnv = process.env.VERCEL_ENV;
      process.env.VERCEL_ENV = 'production';

      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-delete',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await adminRemoveEnrollment('enr-delete');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hard delete is disabled in production');

      process.env.VERCEL_ENV = originalEnv;
    });
  });
});
