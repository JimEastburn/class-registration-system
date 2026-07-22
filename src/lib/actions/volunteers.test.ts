import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  claimVolunteerSlot,
  createVolunteerRole,
  deleteVolunteerRole,
  getVolunteerActivityLog,
  getVolunteerBoard,
  moveVolunteerSignup,
  removeVolunteerSignupAsAdmin,
  releaseVolunteerSignup,
  renameVolunteerRole,
  setVolunteerSlotRequired,
} from '@/lib/actions/volunteers';
import {
  ADMIN_PROFILE,
  PARENT_PROFILE,
  SCHEDULER_PROFILE,
  TEACHER_PROFILE,
  seedFake,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ROLE_1 = '00000000-0000-4000-8000-000000000001';
const ROLE_2 = '00000000-0000-4000-8000-000000000002';
const BLOCK_1 = '00000000-0000-4000-8000-000000000101';
const BLOCK_2 = '00000000-0000-4000-8000-000000000102';
const SLOT_1 = '00000000-0000-4000-8000-000000000201';
const SLOT_2 = '00000000-0000-4000-8000-000000000202';
const SIGNUP_1 = '00000000-0000-4000-8000-000000000301';

const VOLUNTEER_ADMIN_PARENT = {
  ...PARENT_PROFILE,
  id: 'volunteer-admin-parent-123',
  email: 'volunteer-admin-parent@test.com',
  is_parent: true,
  is_volunteer_admin: true,
};

function seedVolunteerFake(authUserId: string | null = ADMIN_PROFILE.id) {
  return seedFake({
    authUserId,
    data: {
      profiles: [
        ADMIN_PROFILE,
        PARENT_PROFILE,
        SCHEDULER_PROFILE,
        TEACHER_PROFILE,
        VOLUNTEER_ADMIN_PARENT,
      ] as unknown as Record<string, unknown>[],
      volunteer_roles: [
        {
          id: ROLE_1,
          name: 'Door Monitor',
          sort_order: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: ROLE_2,
          name: 'Park Monitor',
          sort_order: 2,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      volunteer_blocks: [
        {
          id: BLOCK_1,
          name: 'Tuesday Block 1',
          sort_order: 1,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: BLOCK_2,
          name: 'Tuesday Block 2',
          sort_order: 2,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      volunteer_slots: [
        {
          id: SLOT_1,
          role_id: ROLE_1,
          block_id: BLOCK_1,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: SLOT_2,
          role_id: ROLE_2,
          block_id: BLOCK_1,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      volunteer_signups: [],
      volunteer_activity_log: [
        {
          id: '00000000-0000-4000-8000-000000000401',
          action: 'claim',
          signup_id: SIGNUP_1,
          slot_id: SLOT_1,
          user_id: TEACHER_PROFILE.id,
          display_name: 'Teacher Smith',
          role_id: ROLE_1,
          role_name: 'Door Monitor',
          block_id: BLOCK_1,
          block_name: 'Tuesday Block 1',
          created_at: '2026-01-02T00:00:00Z',
        },
        {
          id: '00000000-0000-4000-8000-000000000402',
          action: 'removal',
          signup_id: SIGNUP_1,
          slot_id: SLOT_1,
          user_id: TEACHER_PROFILE.id,
          display_name: 'Teacher Smith',
          role_id: ROLE_1,
          role_name: 'Door Monitor',
          block_id: BLOCK_1,
          block_name: 'Tuesday Block 1',
          created_at: '2026-01-03T00:00:00Z',
        },
      ],
      audit_logs: [],
    },
  });
}

describe('volunteer actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires exact admin roles for configuration changes', async () => {
    seedVolunteerFake(SCHEDULER_PROFILE.id);

    const result = await createVolunteerRole('Crossing Guard');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('lets an additive volunteer admin configure the board without changing their primary role', async () => {
    const fake = seedVolunteerFake(VOLUNTEER_ADMIN_PARENT.id);

    const boardResult = await getVolunteerBoard();
    const createResult = await createVolunteerRole('Crossing Guard');
    const activityResult = await getVolunteerActivityLog(1);

    expect(boardResult.success).toBe(true);
    expect(createResult.success).toBe(true);
    expect(activityResult.success).toBe(true);
    expect(
      fake.db.profiles.find(
        (profile) => profile.id === VOLUNTEER_ADMIN_PARENT.id
      )
    ).toMatchObject({ role: 'parent', is_volunteer_admin: true });
  });

  it('limits volunteer board access to teachers and admins during the pilot', async () => {
    seedVolunteerFake(PARENT_PROFILE.id);
    const parentResult = await getVolunteerBoard();
    expect(parentResult.success).toBe(false);
    expect(parentResult.error).toBe('Unauthorized');

    seedVolunteerFake(TEACHER_PROFILE.id);
    const teacherResult = await getVolunteerBoard();
    expect(teacherResult.success).toBe(true);
  });

  it('lets volunteer admins read the paginated activity log', async () => {
    seedVolunteerFake(ADMIN_PROFILE.id);

    const result = await getVolunteerActivityLog(1);

    expect(result.success).toBe(true);
    expect(result.data.entries).toHaveLength(2);
    expect(result.data.entries[0]).toMatchObject({
      action: 'removal',
      display_name: 'Teacher Smith',
      block_name: 'Tuesday Block 1',
      role_name: 'Door Monitor',
    });
  });

  it('blocks non-admins from reading the volunteer activity log', async () => {
    seedVolunteerFake(TEACHER_PROFILE.id);

    const result = await getVolunteerActivityLog(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('trims new role names, rejects duplicates, and appends to the end', async () => {
    const fake = seedVolunteerFake();

    const created = await createVolunteerRole('  Crossing Guard  ');
    const duplicate = await createVolunteerRole('crossing guard');

    expect(created.success).toBe(true);
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('already exists');
    expect(fake.db.volunteer_roles.at(-1)).toMatchObject({
      name: 'Crossing Guard',
      sort_order: 3,
    });
  });

  it('rejects case-insensitive duplicate role renames', async () => {
    seedVolunteerFake();

    const result = await renameVolunteerRole(ROLE_2, 'door monitor');

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('prevents deleting a role that has occupied slots', async () => {
    const fake = seedVolunteerFake();
    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: PARENT_PROFILE.id,
      display_name: 'Parent User',
      created_at: '2026-01-01T00:00:00Z',
    });

    const result = await deleteVolunteerRole(ROLE_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('This item has occupied slots');
  });

  it('enables empty slots and refuses to disable occupied slots', async () => {
    const fake = seedVolunteerFake();

    const enabled = await setVolunteerSlotRequired(ROLE_1, BLOCK_2, true);
    expect(enabled.success).toBe(true);
    const newSlot = fake.db.volunteer_slots.find(
      (slot) => slot.role_id === ROLE_1 && slot.block_id === BLOCK_2
    );
    expect(newSlot).toBeTruthy();

    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: PARENT_PROFILE.id,
      display_name: 'Parent User',
      created_at: '2026-01-01T00:00:00Z',
    });

    const disabled = await setVolunteerSlotRequired(ROLE_1, BLOCK_1, false);
    expect(disabled.success).toBe(false);
    expect(disabled.error).toContain('cannot be disabled');
  });

  it('lets a teacher claim a slot and blocks a second role in the same block', async () => {
    const fake = seedVolunteerFake(TEACHER_PROFILE.id);

    const claimed = await claimVolunteerSlot(SLOT_1);
    const secondClaim = await claimVolunteerSlot(SLOT_2);

    expect(claimed.success).toBe(true);
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error).toBe('You already volunteer during this block');
    expect(fake.db.volunteer_signups[0]).toMatchObject({
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: TEACHER_PROFILE.id,
      display_name: 'Teacher Smith',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/volunteer');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/volunteers');
  });

  it('prevents parents from claiming volunteer slots during the pilot', async () => {
    seedVolunteerFake(PARENT_PROFILE.id);

    const result = await claimVolunteerSlot(SLOT_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });

  it('only lets the owner release their own signup', async () => {
    const fake = seedVolunteerFake(ADMIN_PROFILE.id);
    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: TEACHER_PROFILE.id,
      display_name: 'Teacher Smith',
      created_at: '2026-01-01T00:00:00Z',
    });

    const denied = await releaseVolunteerSignup(SIGNUP_1);

    expect(denied.success).toBe(false);
    expect(denied.error).toContain('only remove your own');

    const ownerFake = seedFake({
      authUserId: TEACHER_PROFILE.id,
      data: fake.db,
    });

    const released = await releaseVolunteerSignup(SIGNUP_1);

    expect(released.success).toBe(true);
    expect(ownerFake.db.volunteer_signups).toHaveLength(0);
  });

  it('lets a volunteer admin move another user to an available slot', async () => {
    const fake = seedVolunteerFake(VOLUNTEER_ADMIN_PARENT.id);
    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: TEACHER_PROFILE.id,
      display_name: 'Teacher Smith',
      created_at: '2026-01-01T00:00:00Z',
    });
    fake.setRpcHandler(
      'move_volunteer_signup',
      ({ p_signup_id, p_slot_id }) => {
        const signup = fake.db.volunteer_signups.find(
          (row) => row.id === p_signup_id
        );
        const slot = fake.db.volunteer_slots.find(
          (row) => row.id === p_slot_id
        );
        if (!signup || !slot) return null;
        signup.slot_id = slot.id;
        signup.block_id = slot.block_id;
        return signup;
      }
    );

    const result = await moveVolunteerSignup(SIGNUP_1, SLOT_2);

    expect(result.success).toBe(true);
    expect(fake.db.volunteer_signups[0]).toMatchObject({
      id: SIGNUP_1,
      slot_id: SLOT_2,
      block_id: BLOCK_1,
      user_id: TEACHER_PROFILE.id,
    });
  });

  it('lets a volunteer admin remove another user signup', async () => {
    const fake = seedVolunteerFake(VOLUNTEER_ADMIN_PARENT.id);
    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: TEACHER_PROFILE.id,
      display_name: 'Teacher Smith',
      created_at: '2026-01-01T00:00:00Z',
    });
    fake.setRpcHandler(
      'remove_volunteer_signup_as_admin',
      ({ p_signup_id }) => {
        fake.db.volunteer_signups = fake.db.volunteer_signups.filter(
          (row) => row.id !== p_signup_id
        );
        return null;
      }
    );

    const result = await removeVolunteerSignupAsAdmin(SIGNUP_1);

    expect(result.success).toBe(true);
    expect(fake.db.volunteer_signups).toHaveLength(0);
  });

  it('blocks ordinary parents from managing other users signups', async () => {
    seedVolunteerFake(PARENT_PROFILE.id);

    const moveResult = await moveVolunteerSignup(SIGNUP_1, SLOT_2);
    const removeResult = await removeVolunteerSignupAsAdmin(SIGNUP_1);

    expect(moveResult).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(removeResult).toMatchObject({
      success: false,
      error: 'Unauthorized',
    });
  });
});
