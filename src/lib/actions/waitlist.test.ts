import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promoteFromWaitlist } from '@/lib/actions/waitlist';
import { sendWaitlistNotification } from '@/lib/email';
import {
  seedFake,
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
