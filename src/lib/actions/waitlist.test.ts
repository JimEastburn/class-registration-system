import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promoteFromWaitlist, promoteWaitlistEntryAsAdmin } from '@/lib/actions/waitlist';
import { sendWaitlistNotification } from '@/lib/email';
import {
  seedFake,
  ADMIN_PROFILE,
  PARENT_PROFILE,
  TEACHER_PROFILE,
  type SeedClass,
  type SeedFamilyMember,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendWaitlistNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Seed Data ───────────────────────────────────────────────────────────────

const PARENT_ID = PARENT_PROFILE.id;
const TEACHER_ID = TEACHER_PROFILE.id;
const CLASS_ID = 'class-1';
const CHILD_ID = 'child-waitlisted';

const mockMember: SeedFamilyMember = {
  id: CHILD_ID, parent_id: PARENT_ID,
  first_name: 'Waitlisted', last_name: 'Kid', email: 'kid@test.com', relationship: 'Student',
};

const mockClass: SeedClass = {
  id: CLASS_ID, name: 'Art 101', capacity: 1,
  teacher_id: TEACHER_ID, status: 'published',
  schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
  start_date: '2026-06-01',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('promoteFromWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends waitlist notification email after promoting a student', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          // No confirmed/pending enrollments — capacity is open
          { id: 'enr-waitlisted', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteFromWaitlist(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
    }
    expect(sendWaitlistNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        parentEmail: PARENT_PROFILE.email,
        studentName: 'Waitlisted Kid',
        className: 'Art 101',
      })
    );
  });
});

describe('promoteWaitlistEntryAsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows admin to promote the next waitlisted student', async () => {
    seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: {
        profiles: [ADMIN_PROFILE, PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'enr-waitlisted', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteWaitlistEntryAsAdmin(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toBeNull();
      expect(result.data?.enrollmentId).toBe('enr-waitlisted');
    }
    expect(sendWaitlistNotification).toHaveBeenCalled();
  });

  it('returns unauthorized for non-admin users', async () => {
    seedFake({
      authUserId: PARENT_PROFILE.id,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'enr-waitlisted', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteWaitlistEntryAsAdmin(CLASS_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unauthorized');
    }
  });

  it('returns error when not authenticated', async () => {
    seedFake({
      authUserId: null,
      data: {
        profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteWaitlistEntryAsAdmin(CLASS_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Not authenticated');
    }
  });

  it('returns null data when class is at capacity', async () => {
    seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: {
        profiles: [ADMIN_PROFILE, PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [{ ...mockClass, capacity: 1 }] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'enr-confirmed', student_id: 'other-child', class_id: CLASS_ID, status: 'confirmed' },
          { id: 'enr-waitlisted', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteWaitlistEntryAsAdmin(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns null data when no one is on the waitlist', async () => {
    seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: {
        profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteWaitlistEntryAsAdmin(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });
});
