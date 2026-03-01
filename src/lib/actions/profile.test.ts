import { updateProfile } from './profile';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  seedFake,
  PARENT_PROFILE,
  type SeedProfile,
} from '@/__integration__/fakes/fixtures';
import type { SupabaseFake } from '@/__integration__/fakes/supabase';

// Module mocks (Next.js / Supabase wiring – required for seedFake)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ── Seed data ───────────────────────────────────────────────────────────────

const USER_ID = 'user-123';

const userProfile: SeedProfile = {
  ...PARENT_PROFILE,
  id: USER_ID,
  first_name: 'Original',
  last_name: 'Name',
  email: 'user@test.com',
};

function seed(): SupabaseFake {
  return seedFake({
    authUserId: USER_ID,
    data: {
      profiles: [userProfile] as unknown as Record<string, unknown>[],
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if not authenticated', async () => {
    seedFake({ authUserId: null });

    const formData = new FormData();
    const result = await updateProfile(formData);

    expect(result).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('should update profile successfully', async () => {
    const fake = seed();

    const formData = new FormData();
    formData.append('firstName', 'John');
    formData.append('lastName', 'Doe');
    formData.append('phone', '555-5555');
    formData.append('bio', 'Hello world');
    formData.append('specializations', 'Math');
    formData.append('specializations', 'Science');

    const result = await updateProfile(formData);

    expect(result).toEqual({ success: true, data: undefined });

    // Verify the profile was updated in the fake db
    const profile = fake.db.profiles.find((p) => p.id === USER_ID);
    expect(profile).toBeDefined();
    expect(profile!.first_name).toBe('John');
    expect(profile!.last_name).toBe('Doe');
    expect(profile!.phone).toBe('555-5555');
    expect(profile!.bio).toBe('Hello world');
    expect(profile!.specializations).toEqual(['Math', 'Science']);
  });

  it('should update profile even with minimal fields', async () => {
    const fake = seed();

    const formData = new FormData();
    formData.append('firstName', 'Jane');

    const result = await updateProfile(formData);

    expect(result).toEqual({ success: true, data: undefined });
    const profile = fake.db.profiles.find((p) => p.id === USER_ID);
    expect(profile!.first_name).toBe('Jane');
  });
});
