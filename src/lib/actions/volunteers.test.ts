import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  claimVolunteerSlot,
  createVolunteerRole,
  deleteVolunteerRole,
  releaseVolunteerSignup,
  renameVolunteerRole,
  setVolunteerSlotRequired,
} from '@/lib/actions/volunteers';
import {
  ADMIN_PROFILE,
  PARENT_PROFILE,
  SCHEDULER_PROFILE,
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

function seedVolunteerFake(authUserId: string | null = ADMIN_PROFILE.id) {
  return seedFake({
    authUserId,
    data: {
      profiles: [
        ADMIN_PROFILE,
        PARENT_PROFILE,
        SCHEDULER_PROFILE,
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

  it('lets a user claim a slot and blocks a second role in the same block', async () => {
    const fake = seedVolunteerFake(PARENT_PROFILE.id);

    const claimed = await claimVolunteerSlot(SLOT_1);
    const secondClaim = await claimVolunteerSlot(SLOT_2);

    expect(claimed.success).toBe(true);
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error).toBe('You already volunteer during this block');
    expect(fake.db.volunteer_signups[0]).toMatchObject({
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: PARENT_PROFILE.id,
      display_name: 'Parent User',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/volunteer');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/volunteers');
  });

  it('only lets the owner release their own signup', async () => {
    const fake = seedVolunteerFake(ADMIN_PROFILE.id);
    fake.db.volunteer_signups.push({
      id: SIGNUP_1,
      slot_id: SLOT_1,
      block_id: BLOCK_1,
      user_id: PARENT_PROFILE.id,
      display_name: 'Parent User',
      created_at: '2026-01-01T00:00:00Z',
    });

    const denied = await releaseVolunteerSignup(SIGNUP_1);

    expect(denied.success).toBe(false);
    expect(denied.error).toContain('only remove your own');

    const ownerFake = seedFake({
      authUserId: PARENT_PROFILE.id,
      data: fake.db,
    });

    const released = await releaseVolunteerSignup(SIGNUP_1);

    expect(released.success).toBe(true);
    expect(ownerFake.db.volunteer_signups).toHaveLength(0);
  });
});
