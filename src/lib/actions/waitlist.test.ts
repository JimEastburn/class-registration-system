import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  promoteFromWaitlist,
  promoteWaitlistEntryAsAdmin,
  addToWaitlist,
  removeFromWaitlist,
  getWaitlistPosition,
  getClassWaitlist,
} from '@/lib/actions/waitlist';
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

  it('returns success with null data when no one is on the waitlist', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [] as unknown as Record<string, unknown>[],
      },
    });

    const result = await promoteFromWaitlist(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('returns "Failed to promote from waitlist" when the RPC errors', async () => {
    // The capacity check, waitlist lookup, and UPDATE all happen inside the
    // promote_waitlist_one RPC now. To simulate a DB-level failure, override
    // the fake's rpc dispatch to return an error for that function.
    const fake = seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [] as unknown as Record<string, unknown>[],
      },
    });

    const originalRpc = fake.rpc.bind(fake);
    fake.rpc = (async (fn: string, args: Record<string, unknown> = {}) => {
      if (fn === 'promote_waitlist_one') {
        return { data: null, error: { message: 'simulated RPC failure' } };
      }
      return originalRpc(fn, args);
    }) as unknown as typeof fake.rpc;

    const result = await promoteFromWaitlist(CLASS_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Failed to promote from waitlist');
    }
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

// ── addToWaitlist ───────────────────────────────────────────────────────────

describe('addToWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A "filler" confirmed enrollment so capacity=1 is taken and the next caller
  // legitimately needs to join the waitlist. Without this, the new RPC
  // correctly rejects with WL_SEATS_OPEN.
  const FILLER_ENROLLMENT = {
    id: 'filler-confirmed',
    student_id: 'other-confirmed-child',
    class_id: CLASS_ID,
    status: 'confirmed',
    waitlist_position: null,
  };

  const seed = (extra: Record<string, Record<string, unknown>[]> = {}) =>
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [FILLER_ENROLLMENT] as unknown as Record<string, unknown>[],
        ...extra,
      },
    });

  it('adds at position 1 when the waitlist is empty', async () => {
    const fake = seed();
    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(1);
    }
    const row = fake.db.enrollments.find((e) => e.student_id === CHILD_ID);
    expect(row?.status).toBe('waitlisted');
    expect(row?.waitlist_position).toBe(1);
  });

  it('appends at max+1 when others are already waitlisted', async () => {
    seed({
      enrollments: [
        FILLER_ENROLLMENT,
        { id: 'w1', student_id: 'other-1', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        { id: 'w2', student_id: 'other-2', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 2 },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(3);
    }
  });

  it('rejects when not authenticated', async () => {
    seedFake({ authUserId: null });
    const result = await addToWaitlist(CLASS_ID, CHILD_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Not authenticated');
  });

  it('rejects when the family member does not exist', async () => {
    seed();
    const result = await addToWaitlist(CLASS_ID, 'missing-child');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Family member not found');
  });

  it('rejects when the family member belongs to another parent', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [
          { ...mockMember, parent_id: 'someone-else' },
        ] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
      },
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('do not have permission');
    }
  });

  it('rejects when the student is already confirmed in the class', async () => {
    seed({
      enrollments: [
        FILLER_ENROLLMENT,
        { id: 'already', student_id: CHILD_ID, class_id: CLASS_ID, status: 'confirmed' },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already enrolled');
    }
  });

  it('rejects when the student is already pending in the class (P0-4)', async () => {
    seed({
      enrollments: [
        FILLER_ENROLLMENT,
        { id: 'pending-row', student_id: CHILD_ID, class_id: CLASS_ID, status: 'pending', waitlist_position: null },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already enrolled');
    }
  });

  it('rejects when the student is already on the waitlist', async () => {
    seed({
      enrollments: [
        FILLER_ENROLLMENT,
        { id: 'already-w', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('already on the waitlist');
    }
  });

  it('rejects when the class is not published (P1-4)', async () => {
    seed({
      classes: [{ ...mockClass, status: 'draft' }] as unknown as Record<string, unknown>[],
      // No filler needed — the publication gate fires before capacity.
      enrollments: [] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not available');
    }
  });

  it('rejects when the teacher has blocked the student (P1-5)', async () => {
    seed({
      class_blocks: [
        { id: 'blk-1', teacher_id: TEACHER_ID, student_id: CHILD_ID },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('blocked');
    }
  });

  it('rejects when the class still has open seats (P0-5)', async () => {
    // No filler — capacity=1, zero seats taken, seats are open.
    seed({ enrollments: [] as unknown as Record<string, unknown>[] });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('open seats');
    }
  });

  it('reactivates a previously-cancelled enrollment as waitlisted', async () => {
    const fake = seed({
      enrollments: [
        FILLER_ENROLLMENT,
        { id: 'cancelled-row', student_id: CHILD_ID, class_id: CLASS_ID, status: 'cancelled', waitlist_position: null },
      ] as unknown as Record<string, unknown>[],
    });

    const result = await addToWaitlist(CLASS_ID, CHILD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(1);
    }
    const row = fake.db.enrollments.find((e) => e.id === 'cancelled-row');
    expect(row?.status).toBe('waitlisted');
    expect(row?.waitlist_position).toBe(1);
  });
});

// ── removeFromWaitlist + reorderWaitlistPositions ──────────────────────────

describe('removeFromWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper: seed three waitlisted enrollments (positions 1, 2, 3) belonging
  // to PARENT_ID's family so ownership checks pass.
  const seedThreeWaitlisted = () =>
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [
          { id: 'kid-1', parent_id: PARENT_ID, first_name: 'K1', last_name: 'Test', email: 'k1@test.com', relationship: 'Student' },
          { id: 'kid-2', parent_id: PARENT_ID, first_name: 'K2', last_name: 'Test', email: 'k2@test.com', relationship: 'Student' },
          { id: 'kid-3', parent_id: PARENT_ID, first_name: 'K3', last_name: 'Test', email: 'k3@test.com', relationship: 'Student' },
        ] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'w-1', student_id: 'kid-1', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
          { id: 'w-2', student_id: 'kid-2', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 2 },
          { id: 'w-3', student_id: 'kid-3', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 3 },
        ] as unknown as Record<string, unknown>[],
      },
    });

  it('removes a middle waitlisted entry and decrements positions below it', async () => {
    const fake = seedThreeWaitlisted();
    const result = await removeFromWaitlist('w-2');

    expect(result.success).toBe(true);
    expect(fake.db.enrollments.find((e) => e.id === 'w-2')).toBeUndefined();
    const w1 = fake.db.enrollments.find((e) => e.id === 'w-1');
    const w3 = fake.db.enrollments.find((e) => e.id === 'w-3');
    expect(w1?.waitlist_position).toBe(1);
    expect(w3?.waitlist_position).toBe(2);
  });

  it('removes the first waitlisted entry and shifts the rest down', async () => {
    const fake = seedThreeWaitlisted();
    const result = await removeFromWaitlist('w-1');

    expect(result.success).toBe(true);
    expect(fake.db.enrollments.find((e) => e.id === 'w-1')).toBeUndefined();
    const w2 = fake.db.enrollments.find((e) => e.id === 'w-2');
    const w3 = fake.db.enrollments.find((e) => e.id === 'w-3');
    expect(w2?.waitlist_position).toBe(1);
    expect(w3?.waitlist_position).toBe(2);
  });

  it('removes the last waitlisted entry without reordering anyone', async () => {
    const fake = seedThreeWaitlisted();
    const result = await removeFromWaitlist('w-3');

    expect(result.success).toBe(true);
    expect(fake.db.enrollments.find((e) => e.id === 'w-3')).toBeUndefined();
    const w1 = fake.db.enrollments.find((e) => e.id === 'w-1');
    const w2 = fake.db.enrollments.find((e) => e.id === 'w-2');
    expect(w1?.waitlist_position).toBe(1);
    expect(w2?.waitlist_position).toBe(2);
  });

  it('removes a single-item waitlist without errors', async () => {
    const fake = seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'only', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await removeFromWaitlist('only');

    expect(result.success).toBe(true);
    expect(fake.db.enrollments.find((e) => e.id === 'only')).toBeUndefined();
  });

  it('rejects when not authenticated', async () => {
    seedFake({ authUserId: null });
    const result = await removeFromWaitlist('w-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Not authenticated');
  });

  it('rejects when the enrollment does not exist', async () => {
    seedThreeWaitlisted();
    const result = await removeFromWaitlist('does-not-exist');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Enrollment not found');
  });

  it('rejects when the caller does not own the enrolled student', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [
          { id: 'other-kid', parent_id: 'someone-else', first_name: 'X', last_name: 'Y', email: 'x@test.com', relationship: 'Student' },
        ] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'w-other', student_id: 'other-kid', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await removeFromWaitlist('w-other');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('do not have permission');
    }
  });

  it('rejects when the enrollment is not waitlisted (e.g., pending)', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'pend', student_id: CHILD_ID, class_id: CLASS_ID, status: 'pending', waitlist_position: null },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await removeFromWaitlist('pend');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('This enrollment is not on the waitlist');
    }
  });
});

// ── getWaitlistPosition ────────────────────────────────────────────────────

describe('getWaitlistPosition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the position and total waitlisted for a waitlisted enrollment', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'me', student_id: CHILD_ID, class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 2 },
          { id: 'other-1', student_id: 'o1', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
          { id: 'other-3', student_id: 'o3', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 3 },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await getWaitlistPosition('me');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toBe(2);
      expect(result.data.totalWaitlisted).toBe(3);
    }
  });

  it('rejects when not authenticated', async () => {
    seedFake({ authUserId: null });
    const result = await getWaitlistPosition('me');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Not authenticated');
  });

  it('rejects when the enrollment does not exist', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
        enrollments: [] as unknown as Record<string, unknown>[],
      },
    });
    const result = await getWaitlistPosition('nope');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Enrollment not found');
  });

  it('rejects when the enrollment is not waitlisted', async () => {
    seedFake({
      authUserId: PARENT_ID,
      data: {
        profiles: [PARENT_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [mockMember] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'pend', student_id: CHILD_ID, class_id: CLASS_ID, status: 'pending', waitlist_position: null },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await getWaitlistPosition('pend');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('This enrollment is not on the waitlist');
    }
  });
});

// ── getClassWaitlist ───────────────────────────────────────────────────────

describe('getClassWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns waitlisted enrollments ordered by waitlist_position', async () => {
    // Seed positions out of insert order to confirm ordering is by position.
    seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: {
        profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        family_members: [
          { id: 'a', parent_id: 'p1', first_name: 'A', last_name: 'A', email: 'a@x.com', relationship: 'Student' },
          { id: 'b', parent_id: 'p2', first_name: 'B', last_name: 'B', email: 'b@x.com', relationship: 'Student' },
          { id: 'c', parent_id: 'p3', first_name: 'C', last_name: 'C', email: 'c@x.com', relationship: 'Student' },
        ] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [
          { id: 'e-c', student_id: 'c', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 3 },
          { id: 'e-a', student_id: 'a', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 1 },
          { id: 'e-b', student_id: 'b', class_id: CLASS_ID, status: 'waitlisted', waitlist_position: 2 },
          // Non-waitlisted should be excluded.
          { id: 'e-pend', student_id: 'a', class_id: CLASS_ID, status: 'pending' },
        ] as unknown as Record<string, unknown>[],
      },
    });

    const result = await getClassWaitlist(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((e) => e.id)).toEqual(['e-a', 'e-b', 'e-c']);
      expect(result.data.every((e) => e.status === 'waitlisted')).toBe(true);
    }
  });

  it('returns an empty array for a class with no waitlist', async () => {
    seedFake({
      authUserId: ADMIN_PROFILE.id,
      data: {
        profiles: [ADMIN_PROFILE, TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        classes: [mockClass] as unknown as Record<string, unknown>[],
        enrollments: [] as unknown as Record<string, unknown>[],
      },
    });

    const result = await getClassWaitlist(CLASS_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });
});
