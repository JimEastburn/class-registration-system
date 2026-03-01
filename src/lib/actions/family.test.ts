import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/actions/family';
import { revalidatePath } from 'next/cache';
import {
  seedFake,
  PARENT_PROFILE,
  type SeedFamilyMember,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const childMember: SeedFamilyMember = {
  id: 'child-1', parent_id: 'parent-123',
  first_name: 'Kid', last_name: 'User', email: 'kid@example.com', relationship: 'Student',
};

function seed(authUserId: string | null, overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId,
    data: {
      profiles: [{ ...PARENT_PROFILE, is_parent: true }] as unknown as Record<string, unknown>[],
      family_members: [] as Record<string, unknown>[],
      audit_logs: [] as Record<string, unknown>[],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Family Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createFamilyMember', () => {
    it('creates member successfully', async () => {
      const fake = seed('parent-123');
      const result = await createFamilyMember({
        firstName: 'Kid', lastName: 'Doe', email: 'kid@example.com', relationship: 'Student',
      });
      expect(result.data).toBeDefined();
      expect(result.data?.first_name).toBe('Kid');
      expect(result.error).toBeNull();
      expect(revalidatePath).toHaveBeenCalled();
      expect(fake.db.family_members).toHaveLength(1);
      expect(fake.db.family_members[0].parent_id).toBe('parent-123');
    });

    it('enforces ownership by assigning the authenticated user as parent_id', async () => {
      const fake = seed('parent-123');
      await createFamilyMember({
        firstName: 'Kid', lastName: 'Doe', email: 'kid@example.com', relationship: 'Student',
      });
      expect(fake.db.family_members[0].parent_id).toBe('parent-123');
    });

    it('handles unauthenticated user', async () => {
      seed(null);
      const result = await createFamilyMember({
        firstName: 'Kid', lastName: 'Doe', email: 'kid@example.com', relationship: 'Student',
      });
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('updateFamilyMember', () => {
    it('updates member if owned by user', async () => {
      const fake = seed('parent-123', {
        family_members: [childMember] as unknown as Record<string, unknown>[],
      });
      const result = await updateFamilyMember({ id: 'child-1', firstName: 'Updated' });
      expect(result.data?.first_name).toBe('Updated');
      expect(result.error).toBeNull();
      expect(fake.db.family_members.find((m) => m.id === 'child-1')?.first_name).toBe('Updated');
    });

    it('fails if member not found or not owned', async () => {
      seed('parent-123');
      const result = await updateFamilyMember({ id: 'other-child', firstName: 'Updated' });
      expect(result.error).toContain('not found or you do not have permission');
    });
  });

  describe('deleteFamilyMember', () => {
    it('deletes member if owned', async () => {
      const fake = seed('parent-123', {
        family_members: [childMember] as unknown as Record<string, unknown>[],
      });
      const result = await deleteFamilyMember('child-1');
      expect(result.success).toBe(true);
      expect(fake.db.family_members).toHaveLength(0);
    });
  });
});
