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
  getEnrollmentsForFamilyMember,
  getEnrollmentsForFamily,
  getActiveEnrollmentCount,
  getClassRoster,
  getAllEnrollments,
} from '@/lib/actions/enrollments';
import { promoteFromWaitlist } from '@/lib/actions/waitlist';
import { notifyWaitlistJoined } from '@/lib/notifications/waitlist-joined';
import { notifyEnrollmentCancelled } from '@/lib/notifications/enrollment-cancelled';
import { checkStudentScheduleConflict } from '@/lib/logic/scheduling';
import { logAuditAction } from '@/lib/actions/audit';
import {
  notifyTeacherOfEnrollment,
  notifyTeacherOfUnenrollment,
} from '@/lib/notifications/teacher-enrollment';
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
}));
vi.mock('@/lib/notifications/teacher-enrollment', () => ({
  notifyTeacherOfEnrollment: vi.fn().mockResolvedValue(undefined),
  notifyTeacherOfUnenrollment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/notifications/waitlist-joined', () => ({
  notifyWaitlistJoined: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/notifications/enrollment-cancelled', () => ({
  notifyEnrollmentCancelled: vi.fn().mockResolvedValue(undefined),
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

    /**
     * A cancelled class holds no active enrollments, so it must not accept new
     * ones either. The parent path is also blocked incidentally today, by the
     * "Anyone can view published classes" RLS policy making the class lookup
     * return nothing -- but SupabaseFake models no RLS, which is exactly why the
     * action checks status explicitly rather than leaning on a policy that could
     * change. See 20260806120000_cancel_enrollments_with_class.sql.
     */
    it('refuses to enroll a student into a cancelled class', async () => {
      const fake = seed({
        classes: [{ ...mockClass, status: 'cancelled' }] as unknown as Record<
          string,
          unknown
        >[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBeNull();
      expect(result.error).toBe('This class has been cancelled');
      expect(fake.db.enrollments).toEqual([]);
    });

    it('notifies the teacher when a student takes a seat', async () => {
      seed();
      await enrollStudent({ classId: CLASS_ID, familyMemberId: CHILD_ID });
      expect(notifyTeacherOfEnrollment).toHaveBeenCalledWith(
        CLASS_ID,
        CHILD_ID
      );
    });

    it('does not notify the teacher when the student is waitlisted', async () => {
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
      expect(notifyTeacherOfEnrollment).not.toHaveBeenCalled();
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

    it('assigns the next waitlist position when others are already waitlisted', async () => {
      seed({
        enrollments: [
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `enr-${i}`,
            student_id: `other-${i}`,
            class_id: CLASS_ID,
            status: 'confirmed',
          })),
          {
            id: 'enr-wait-1',
            student_id: 'other-wait',
            class_id: CLASS_ID,
            status: 'waitlisted',
            waitlist_position: 1,
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });
      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(2);
    });

    /**
     * Joining a waitlist used to be silent — families only heard from us later,
     * if a seat opened and they were promoted. enroll_student() auto-waitlists
     * when a class is full, so this path has to notify just like the explicit
     * addToWaitlist button does, or which button a parent happened to press
     * decides whether they hear anything.
     */
    it('emails the family when a full class puts the student on the waitlist', async () => {
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
      expect(notifyWaitlistJoined).toHaveBeenCalledWith(CLASS_ID, CHILD_ID, 1);
    });

    it('does not send the waitlist email when a seat was available', async () => {
      seed();

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('pending');
      expect(notifyWaitlistJoined).not.toHaveBeenCalled();
    });

    /**
     * Regression guard: enroll_student used to derive the next position from
     * count(*) + 1, which is only correct while positions are gapless.
     * cancelEnrollment hard-deletes a waitlisted row without renumbering, so
     * positions 1,2,3 become 1,3 and count(*) + 1 returns 3 — colliding with the
     * existing position 3 and tripping uq_enrollments_class_waitlist_position,
     * which left the family unable to join the waitlist at all.
     */
    it('skips over gaps left by a cancelled waitlist entry', async () => {
      seed({
        enrollments: [
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `enr-${i}`,
            student_id: `other-${i}`,
            class_id: CLASS_ID,
            status: 'confirmed',
          })),
          // Position 2 was cancelled and deleted; 1 and 3 remain.
          {
            id: 'enr-wait-1',
            student_id: 'other-wait-1',
            class_id: CLASS_ID,
            status: 'waitlisted',
            waitlist_position: 1,
          },
          {
            id: 'enr-wait-3',
            student_id: 'other-wait-3',
            class_id: CLASS_ID,
            status: 'waitlisted',
            waitlist_position: 3,
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('waitlisted');
      // max(3) + 1, not count(2) + 1 — which would have collided with position 3.
      expect(result.data!.waitlist_position).toBe(4);
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

    // ── P3: parent-path edge case branches ────────────────────────────────

    it('returns an error when registration is closed (system setting)', async () => {
      seed({
        system_settings: [
          {
            key: 'registration_settings',
            value: { registrationOpen: false },
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.error).toContain('Registration is currently closed');
      expect(result.data).toBeNull();
    });

    it('returns an error when the current date is outside the semester window', async () => {
      seed({
        system_settings: [
          {
            key: 'registration_settings',
            value: {
              registrationOpen: true,
              // Window ends well before "now"; current code rejects when now > end.
              semesterStart: '2020-01-01',
              semesterEnd: '2020-12-31',
            },
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.error).toContain('outside the current semester');
      expect(result.data).toBeNull();
    });

    it('rejects when the student already has an active enrollment in this class', async () => {
      seed({
        enrollments: [
          {
            id: 'already',
            student_id: CHILD_ID,
            class_id: CLASS_ID,
            status: 'pending',
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.data).toBeNull();
      expect(result.error).toContain('already enrolled');
    });

    it("reactivates the parent's own cancelled enrollment via the atomic RPC (Part 3)", async () => {
      // Pre-existing cancelled enrollment for the same (student, class) —
      // the parent re-enrolls. The RPC's ON CONFLICT upsert should reactivate
      // the row in place (same id) as pending. Pre-Part-3 this hit a UNIQUE
      // violation; this test guards the new behaviour.
      const fake = seed({
        enrollments: [
          {
            id: 'previously-cancelled',
            student_id: CHILD_ID,
            class_id: CLASS_ID,
            status: 'cancelled',
            waitlist_position: null,
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('pending');
      expect(result.error).toBeNull();
      // Same row reactivated in place (mirror of ON CONFLICT DO UPDATE).
      const row = fake.db.enrollments.find(
        (e) => e.id === 'previously-cancelled'
      );
      expect(row?.status).toBe('pending');
      // No duplicate row was pushed.
      const all = fake.db.enrollments.filter(
        (e) => e.student_id === CHILD_ID && e.class_id === CLASS_ID
      );
      expect(all).toHaveLength(1);
    });

    it('rejects when the family member does not belong to the caller', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          // Student belongs to a different parent.
          family_members: [
            {
              ...mockMember,
              parent_id: 'someone-else',
            },
          ] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
        },
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.data).toBeNull();
      expect(result.error).toContain('Family member not found');
    });

    it('rejects when the family member is not a student (e.g., a Parent/Guardian record)', async () => {
      seed({
        family_members: [
          { ...mockMember, relationship: 'Parent/Guardian' },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.data).toBeNull();
      expect(result.error).toContain('Only students can be enrolled');
    });

    it('rejects when the class does not exist', async () => {
      seed({ classes: [] });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.data).toBeNull();
      expect(result.error).toBe('Class not found');
    });
  });

  /**
   * The on_waitlist_{delete,update}_resequence triggers keep positions contiguous
   * no matter which path removes a waitlisted row — previously only
   * removeFromWaitlist renumbered, so every other path left a gap and families
   * saw inflated position numbers. See migration
   * 20260804100000_resequence_waitlist_on_removal.sql.
   */
  describe('waitlist resequencing on removal', () => {
    // Full class (capacity 10 taken) plus three waitlisted at 1, 2, 3.
    const seedFullClassWithWaitlist = () =>
      seed({
        // The waitlisted students must belong to PARENT_ID for
        // cancelEnrollment's ownership check to pass.
        family_members: [
          mockMember,
          ...[1, 2, 3].map((n) => ({
            id: `wait-${n}`,
            parent_id: PARENT_ID,
            first_name: `W${n}`,
            last_name: 'Test',
            email: `w${n}@test.com`,
            relationship: 'Student',
          })),
        ] as unknown as Record<string, unknown>[],
        enrollments: [
          ...Array.from({ length: 10 }, (_, i) => ({
            id: `seat-${i}`,
            student_id: `other-${i}`,
            class_id: CLASS_ID,
            status: 'confirmed',
          })),
          ...[1, 2, 3].map((pos) => ({
            id: `w-${pos}`,
            student_id: `wait-${pos}`,
            class_id: CLASS_ID,
            status: 'waitlisted',
            waitlist_position: pos,
          })),
        ] as unknown as Record<string, unknown>[],
      });

    const positions = (fake: ReturnType<typeof seed>) =>
      fake.db.enrollments
        .filter((e) => e.status === 'waitlisted')
        .map((e) => e.waitlist_position)
        .sort((a, b) => (a as number) - (b as number));

    it('closes the gap when a parent cancels from the middle of the waitlist', async () => {
      const fake = seedFullClassWithWaitlist();

      const result = await cancelEnrollment('w-2');

      expect(result.success).toBe(true);
      expect(positions(fake)).toEqual([1, 2]);
      // The person who was #3 moves up to #2 rather than staying at #3.
      expect(
        fake.db.enrollments.find((e) => e.id === 'w-3')?.waitlist_position
      ).toBe(2);
    });

    it('preserves relative order when the front of the waitlist leaves', async () => {
      const fake = seedFullClassWithWaitlist();

      await cancelEnrollment('w-1');

      expect(
        fake.db.enrollments.find((e) => e.id === 'w-2')?.waitlist_position
      ).toBe(1);
      expect(
        fake.db.enrollments.find((e) => e.id === 'w-3')?.waitlist_position
      ).toBe(2);
    });

    it('leaves positions untouched when the last person leaves', async () => {
      const fake = seedFullClassWithWaitlist();

      await cancelEnrollment('w-3');

      expect(positions(fake)).toEqual([1, 2]);
    });

    it('keeps positions contiguous for the next person to join', async () => {
      const fake = seedFullClassWithWaitlist();
      await cancelEnrollment('w-2');

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(3);
      expect(positions(fake)).toEqual([1, 2, 3]);
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

    it('logs the un-enrollment and notifies both the teacher and the family', async () => {
      seed({
        enrollments: [
          {
            id: 'enr-cxl',
            student_id: CHILD_ID,
            class_id: CLASS_ID,
            status: 'pending',
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await cancelEnrollment('enr-cxl');
      expect(result.success).toBe(true);
      // The hard-delete path has no DB trigger, so the action must log it itself.
      expect(logAuditAction).toHaveBeenCalledWith(
        PARENT_ID,
        'parent_cancel_enrollment',
        'enrollment',
        'enr-cxl',
        expect.objectContaining({
          student_id: CHILD_ID,
          class_id: CLASS_ID,
          previous_status: 'pending',
        })
      );
      expect(notifyTeacherOfUnenrollment).toHaveBeenCalledWith(
        CLASS_ID,
        CHILD_ID
      );
      // Losing one seat used to be silent for the family: cancelling a whole
      // class emailed everyone, dropping one child from it emailed nobody.
      expect(notifyEnrollmentCancelled).toHaveBeenCalledWith(
        CLASS_ID,
        CHILD_ID
      );
    });

    it('logs but does not email the teacher when a waitlisted seat is cancelled', async () => {
      seed({
        enrollments: [
          {
            id: 'enr-wl',
            student_id: CHILD_ID,
            class_id: CLASS_ID,
            status: 'waitlisted',
            waitlist_position: 1,
          },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await cancelEnrollment('enr-wl');
      expect(result.success).toBe(true);
      expect(logAuditAction).toHaveBeenCalledWith(
        PARENT_ID,
        'parent_cancel_enrollment',
        'enrollment',
        'enr-wl',
        expect.objectContaining({ previous_status: 'waitlisted' })
      );
      expect(notifyTeacherOfUnenrollment).not.toHaveBeenCalled();
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

    it('notifies the teacher and the family when cancelling a confirmed seat', async () => {
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
      expect(notifyTeacherOfUnenrollment).toHaveBeenCalledWith(
        CLASS_ID,
        CHILD_ID
      );
      expect(notifyEnrollmentCancelled).toHaveBeenCalledWith(
        CLASS_ID,
        CHILD_ID
      );
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

    /**
     * This path runs on the admin client, which bypasses RLS entirely, so the
     * explicit status check is the only thing between an admin and a student
     * enrolled in a class that is not running. The class picker only offers
     * published classes, but the action must not trust its caller for that.
     */
    it('refuses to enroll a student into a cancelled class', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [
            { ...ADMIN_CLASS, status: 'cancelled' },
          ] as unknown as Record<string, unknown>[],
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

      expect(result.data).toBeNull();
      expect(result.error).toContain('cancelled');
      expect(fake.db.enrollments).toEqual([]);
    });

    /**
     * Pins the fake's enroll_student handler against the SQL function's own
     * rejection, so the action-level checks above are not the only thing
     * standing between a regression and a silent re-enrollment.
     */
    it('surfaces EN_CLASS_CANCELLED from the enroll_student RPC', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          classes: [
            { ...ADMIN_CLASS, status: 'cancelled' },
          ] as unknown as Record<string, unknown>[],
          enrollments: [],
        },
      });

      const { data, error } = await fake.rpc('enroll_student', {
        p_student_id: STUDENT_MEMBER.id,
        p_class_id: ADMIN_CLASS.id,
      });

      expect(data).toBeNull();
      expect((error as { hint?: string } | null)?.hint).toBe(
        'EN_CLASS_CANCELLED'
      );
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

    // ── P4: reactivation permutations ───────────────────────────────────

    it('reactivates a cancelled enrollment into a FULL class → row becomes waitlisted while function returns "reactivated"', async () => {
      // The existing reactivation test uses an empty class. This permutation
      // verifies: when reactivating into a class already at capacity, the
      // row goes onto the waitlist with the next position, but the function
      // still labels the response status as 'reactivated' (admin-UX
      // distinction kept after Part 3).
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
            // Class capacity is 3; fill all seats with other students.
            {
              id: 'fill-1',
              student_id: 'other-1',
              class_id: ADMIN_CLASS.id,
              status: 'confirmed',
            },
            {
              id: 'fill-2',
              student_id: 'other-2',
              class_id: ADMIN_CLASS.id,
              status: 'pending',
            },
            {
              id: 'fill-3',
              student_id: 'other-3',
              class_id: ADMIN_CLASS.id,
              status: 'confirmed',
            },
            // The target student has a prior CANCELLED enrollment.
            {
              id: 'cancelled-row',
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

      // Function response status remains 'reactivated' (admin UX label).
      expect(result.error).toBeNull();
      expect(result.status).toBe('reactivated');

      // The actual row landed on the waitlist (since the class was full).
      const reactivatedRow = fake.db.enrollments.find(
        (e) => e.id === 'cancelled-row'
      );
      expect(reactivatedRow?.status).toBe('waitlisted');
      expect(reactivatedRow?.waitlist_position).toBe(1);
    });
  });

  // ── P4: enrollStudent permutations (mirror of the RPC's count logic) ───

  describe('enrollStudent (P4 permutations)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(checkStudentScheduleConflict).mockReturnValue(null);
    });

    it('excludes cancelled rows from the capacity count', async () => {
      // Class capacity 2. Mix: 2 pending + 5 cancelled. Capacity is *full*
      // (2 of 2 seats taken). Cancelled rows must NOT count, so the new
      // enrollment should waitlist — not pend.
      seed({
        enrollments: [
          {
            id: 'p1',
            student_id: 'p-1',
            class_id: CLASS_ID,
            status: 'pending',
          },
          {
            id: 'p2',
            student_id: 'p-2',
            class_id: CLASS_ID,
            status: 'pending',
          },
          {
            id: 'c1',
            student_id: 'c-1',
            class_id: CLASS_ID,
            status: 'cancelled',
          },
          {
            id: 'c2',
            student_id: 'c-2',
            class_id: CLASS_ID,
            status: 'cancelled',
          },
          {
            id: 'c3',
            student_id: 'c-3',
            class_id: CLASS_ID,
            status: 'cancelled',
          },
          {
            id: 'c4',
            student_id: 'c-4',
            class_id: CLASS_ID,
            status: 'cancelled',
          },
          {
            id: 'c5',
            student_id: 'c-5',
            class_id: CLASS_ID,
            status: 'cancelled',
          },
        ] as unknown as Record<string, unknown>[],
        classes: [{ ...mockClass, capacity: 2 }] as unknown as Record<
          string,
          unknown
        >[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(1);
    });

    it('enrolls as pending when exactly one seat remains (boundary: cap-1)', async () => {
      // Class capacity 3, 2 pending → one seat left → next enroll = pending.
      seed({
        classes: [{ ...mockClass, capacity: 3 }] as unknown as Record<
          string,
          unknown
        >[],
        enrollments: [
          {
            id: 'p1',
            student_id: 'p-1',
            class_id: CLASS_ID,
            status: 'pending',
          },
          {
            id: 'p2',
            student_id: 'p-2',
            class_id: CLASS_ID,
            status: 'pending',
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('pending');
    });

    it('waitlists at the exact capacity boundary (cap seats taken)', async () => {
      // Class capacity 3, 3 pending → at capacity → next enroll = waitlisted.
      seed({
        classes: [{ ...mockClass, capacity: 3 }] as unknown as Record<
          string,
          unknown
        >[],
        enrollments: [
          {
            id: 'p1',
            student_id: 'p-1',
            class_id: CLASS_ID,
            status: 'pending',
          },
          {
            id: 'p2',
            student_id: 'p-2',
            class_id: CLASS_ID,
            status: 'pending',
          },
          {
            id: 'p3',
            student_id: 'p-3',
            class_id: CLASS_ID,
            status: 'pending',
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await enrollStudent({
        classId: CLASS_ID,
        familyMemberId: CHILD_ID,
      });

      expect(result.status).toBe('waitlisted');
      expect(result.data!.waitlist_position).toBe(1);
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
      expect(result.error).toBe(
        'Access denied: You are not the teacher of this class'
      );
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

  // ── P5: Read-path coverage ─────────────────────────────────────────────

  describe('getEnrollmentsForFamilyMember', () => {
    it("returns enrollments for the caller's own student", async () => {
      seed({
        enrollments: [
          {
            id: 'e-1',
            student_id: CHILD_ID,
            class_id: CLASS_ID,
            status: 'pending',
          },
          // Another student's enrollment must NOT be returned.
          {
            id: 'e-2',
            student_id: 'other-kid',
            class_id: CLASS_ID,
            status: 'confirmed',
          },
        ] as unknown as Record<string, unknown>[],
      });

      const result = await getEnrollmentsForFamilyMember(CHILD_ID);

      expect(result.error).toBeNull();
      expect(result.data?.map((e) => e.id)).toEqual(['e-1']);
    });

    it('rejects when the family member does not belong to the caller', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [
            { ...mockMember, parent_id: 'someone-else' },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getEnrollmentsForFamilyMember(CHILD_ID);

      expect(result.data).toBeNull();
      expect(result.error).toContain('Family member not found');
    });

    it('rejects when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getEnrollmentsForFamilyMember(CHILD_ID);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getEnrollmentsForFamily', () => {
    it('returns enrollments for all children of the parent', async () => {
      const sibling: SeedFamilyMember = {
        id: 'sibling-1',
        parent_id: PARENT_ID,
        first_name: 'Sib',
        last_name: 'Test',
        email: 'sib@test.com',
        relationship: 'Student',
      };
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember, sibling] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'e-kid',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
            },
            {
              id: 'e-sib',
              student_id: 'sibling-1',
              class_id: CLASS_ID,
              status: 'confirmed',
            },
            // Outside the family — must not appear.
            {
              id: 'e-out',
              student_id: 'stranger',
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getEnrollmentsForFamily();

      expect(result.error).toBeNull();
      const ids = (result.data ?? []).map((e) => e.id).sort();
      expect(ids).toEqual(['e-kid', 'e-sib']);
    });

    it('returns an empty array when the parent has no family members', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getEnrollmentsForFamily();

      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    });

    it('rejects when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getEnrollmentsForFamily();
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getActiveEnrollmentCount', () => {
    it('counts only confirmed enrollments across the family', async () => {
      const sibling: SeedFamilyMember = {
        id: 'sibling-2',
        parent_id: PARENT_ID,
        first_name: 'Sib2',
        last_name: 'Test',
        email: 'sib2@test.com',
        relationship: 'Student',
      };
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember, sibling] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'c1',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
            {
              id: 'c2',
              student_id: 'sibling-2',
              class_id: CLASS_ID,
              status: 'confirmed',
            },
            // Non-confirmed statuses must NOT count.
            {
              id: 'p1',
              student_id: CHILD_ID,
              class_id: 'other',
              status: 'pending',
            },
            {
              id: 'w1',
              student_id: CHILD_ID,
              class_id: 'other',
              status: 'waitlisted',
            },
            {
              id: 'x1',
              student_id: CHILD_ID,
              class_id: 'other',
              status: 'cancelled',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getActiveEnrollmentCount();

      expect(result.error).toBeNull();
      expect(result.count).toBe(2);
    });

    it('returns 0 when the family has no children', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          family_members: [] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getActiveEnrollmentCount();

      expect(result.error).toBeNull();
      expect(result.count).toBe(0);
    });

    it('rejects when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getActiveEnrollmentCount();
      expect(result.error).toBe('Not authenticated');
      expect(result.count).toBe(0);
    });
  });

  describe('getClassRoster', () => {
    // This powers the admin class-detail page — the exact page that surfaced
    // the original "15/14" issue. The page filters the roster by status to
    // derive enrolled/waitlisted counts, so the roster must return all three
    // active statuses (pending, confirmed, waitlisted) and exclude cancelled.

    it('returns confirmed + pending + waitlisted, excludes cancelled, for the class teacher', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'r-conf',
              student_id: 'a',
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-01-01',
            },
            {
              id: 'r-pend',
              student_id: 'b',
              class_id: CLASS_ID,
              status: 'pending',
              created_at: '2026-01-02',
            },
            {
              id: 'r-wait',
              student_id: 'c',
              class_id: CLASS_ID,
              status: 'waitlisted',
              waitlist_position: 1,
              created_at: '2026-01-03',
            },
            {
              id: 'r-cxl',
              student_id: 'd',
              class_id: CLASS_ID,
              status: 'cancelled',
              created_at: '2026-01-04',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getClassRoster(CLASS_ID);

      expect(result.error).toBeNull();
      const ids = (result.data ?? []).map((e) => e.id).sort();
      expect(ids).toEqual(['r-conf', 'r-pend', 'r-wait']);
    });

    it('grants access to admins even when not the teacher', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [
            ADMIN_PROFILE,
            PARENT_PROFILE,
            TEACHER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'r-1',
              student_id: 'x',
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-01-01',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getClassRoster(CLASS_ID);

      expect(result.error).toBeNull();
      expect(result.data?.length).toBe(1);
    });

    it('rejects when the caller is neither the teacher nor an admin', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getClassRoster(CLASS_ID);

      expect(result.data).toBeNull();
      expect(result.error).toContain('Access denied');
    });

    it('returns "Class not found" for a non-existent class id', async () => {
      seedFake({
        authUserId: TEACHER_ID,
        data: {
          profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          classes: [] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getClassRoster('nope');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Class not found');
    });

    it('rejects when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getClassRoster(CLASS_ID);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getAllEnrollments', () => {
    it('returns paginated enrollments and a complete status breakdown for an admin caller', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [
            ADMIN_PROFILE,
            PARENT_PROFILE,
            TEACHER_PROFILE,
          ] as unknown as Record<string, unknown>[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'a-1',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
            },
            {
              id: 'a-2',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
            {
              id: 'a-3',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'waitlisted',
            },
            {
              id: 'a-4',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'cancelled',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllEnrollments();

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.length).toBeGreaterThanOrEqual(1);
      expect(result.statusCounts).toEqual({
        confirmed: 1,
        pending: 1,
        waitlisted: 1,
        cancelled: 1,
      });
    });

    it('keeps all status totals visible while filtering the table to one status', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'a-1',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
            },
            {
              id: 'a-2',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllEnrollments(1, 20, { status: 'pending' });

      expect(result.data?.map((enrollment) => enrollment.status)).toEqual([
        'pending',
      ]);
      expect(result.count).toBe(1);
      expect(result.statusCounts).toEqual({
        confirmed: 1,
        pending: 1,
        waitlisted: 0,
        cancelled: 0,
      });
    });

    it('applies class, student search, and enrollment-date filters to status totals', async () => {
      const otherMember = {
        ...mockMember,
        id: 'child-other',
        first_name: 'Alice',
        last_name: 'Jones',
      };
      const otherClass = { ...mockClass, id: 'class-other', name: 'Art' };

      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember, otherMember] as unknown as Record<
            string,
            unknown
          >[],
          classes: [mockClass, otherClass] as unknown as Record<
            string,
            unknown
          >[],
          enrollments: [
            {
              id: 'before-range',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-08-01T04:59:59.999Z',
            },
            {
              id: 'range-start',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
              created_at: '2026-08-01T05:00:00.000Z',
            },
            {
              id: 'range-end',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'waitlisted',
              created_at: '2026-08-03T04:59:59.999Z',
            },
            {
              id: 'after-range',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'cancelled',
              created_at: '2026-08-03T05:00:00.000Z',
            },
            {
              id: 'wrong-student',
              student_id: otherMember.id,
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-08-02T12:00:00.000Z',
            },
            {
              id: 'wrong-class',
              student_id: CHILD_ID,
              class_id: otherClass.id,
              status: 'confirmed',
              created_at: '2026-08-02T12:00:00.000Z',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllEnrollments(1, 20, {
        classId: CLASS_ID,
        search: mockMember.first_name,
        startDate: '2026-08-01',
        endDate: '2026-08-02',
      });

      expect(result.filterError).toBeNull();
      expect(result.data?.map((enrollment) => enrollment.id)).toEqual([
        'range-end',
        'range-start',
      ]);
      expect(result.statusCounts).toEqual({
        confirmed: 0,
        pending: 1,
        waitlisted: 1,
        cancelled: 0,
      });
    });

    it('supports open-ended enrollment-date ranges', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'old',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-07-15T12:00:00.000Z',
            },
            {
              id: 'new',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
              created_at: '2026-08-15T12:00:00.000Z',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const afterStart = await getAllEnrollments(1, 20, {
        startDate: '2026-08-01',
      });
      const beforeEnd = await getAllEnrollments(1, 20, {
        endDate: '2026-07-31',
      });

      expect(afterStart.data?.map((enrollment) => enrollment.id)).toEqual([
        'new',
      ]);
      expect(beforeEnd.data?.map((enrollment) => enrollment.id)).toEqual([
        'old',
      ]);
    });

    it('uses Austin calendar-day boundaries across daylight-saving changes', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<
            string,
            unknown
          >[],
          family_members: [mockMember] as unknown as Record<string, unknown>[],
          classes: [mockClass] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'before-local-day',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'confirmed',
              created_at: '2026-03-08T05:59:59.999Z',
            },
            {
              id: 'local-day-start',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'pending',
              created_at: '2026-03-08T06:00:00.000Z',
            },
            {
              id: 'local-day-end',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'waitlisted',
              created_at: '2026-03-09T04:59:59.999Z',
            },
            {
              id: 'after-local-day',
              student_id: CHILD_ID,
              class_id: CLASS_ID,
              status: 'cancelled',
              created_at: '2026-03-09T05:00:00.000Z',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllEnrollments(1, 20, {
        startDate: '2026-03-08',
        endDate: '2026-03-08',
      });

      expect(result.data?.map((enrollment) => enrollment.id)).toEqual([
        'local-day-end',
        'local-day-start',
      ]);
      expect(result.statusCounts).toEqual({
        confirmed: 0,
        pending: 1,
        waitlisted: 1,
        cancelled: 0,
      });
    });

    it('returns an inline filter error for invalid date ranges', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
        },
      });

      const reversed = await getAllEnrollments(1, 20, {
        startDate: '2026-08-10',
        endDate: '2026-08-01',
      });
      const malformed = await getAllEnrollments(1, 20, {
        startDate: 'August 1',
      });

      expect(reversed.error).toBeNull();
      expect(reversed.filterError).toBe(
        'Start date must be on or before end date.'
      );
      expect(reversed.data).toEqual([]);
      expect(malformed.filterError).toBe('Enter a valid enrollment date.');
    });

    it('rejects non-admin users with Access denied', async () => {
      seedFake({
        authUserId: PARENT_ID,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllEnrollments();

      expect(result.data).toBeNull();
      expect(result.error).toBe('Access denied');
    });

    it('rejects when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getAllEnrollments();
      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authenticated');
    });
  });
});
