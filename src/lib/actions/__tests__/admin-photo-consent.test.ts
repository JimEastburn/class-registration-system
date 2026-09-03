import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { adminUpdatePhotoConsent } from '@/lib/actions/admin';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { seedFake, type SeedProfile } from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

const student = {
  id: 'student-1',
  parent_id: 'another-family',
  first_name: 'Student',
  last_name: 'One',
  relationship: 'Student',
  photo_consent: false,
};

function seed(profile: Partial<SeedProfile> = {}, photoConsent = false) {
  return seedFake({
    authUserId: 'actor-1',
    data: {
      profiles: [
        {
          id: 'actor-1',
          first_name: 'Consent',
          last_name: 'Administrator',
          role: 'admin',
          is_photo_consent_admin: false,
          ...profile,
        },
      ],
      family_members: [
        { ...student, photo_consent: photoConsent },
        { ...student, id: 'student-2' },
      ],
      audit_logs: [],
    },
  });
}

describe('adminUpdatePhotoConsent', () => {
  beforeEach(() => vi.clearAllMocks());

  describe.each([
    { label: 'admin', role: 'admin' as const },
    { label: 'super admin', role: 'super_admin' as const },
    {
      label: 'Photo Consent Administrator',
      role: 'parent' as const,
      is_photo_consent_admin: true,
    },
  ])('$label', ({ label: _label, ...profile }) => {
    it.each([true, false])(
      'sets another family’s student consent to %s and audits the actor',
      async (photoConsent) => {
        const fake = seed(profile, !photoConsent);

        const result = await adminUpdatePhotoConsent(student.id, photoConsent);

        expect(result).toEqual({ success: true, error: null });
        expect(fake.db.family_members[0].photo_consent).toBe(photoConsent);
        expect(fake.db.family_members[1].photo_consent).toBe(false);
        expect(fake.db.audit_logs).toEqual([
          expect.objectContaining({
            user_id: 'actor-1',
            action: 'family_member.photo_consent_updated',
            target_type: 'family_member',
            target_id: student.id,
            details: {
              previous_photo_consent: !photoConsent,
              photo_consent: photoConsent,
            },
          }),
        ]);
        expect(revalidatePath).toHaveBeenCalledWith('/admin/photo-consents');
        expect(revalidatePath).toHaveBeenCalledWith('/parent/family');
      }
    );
  });

  it.each(['parent', 'teacher', 'student', 'class_scheduler'] as const)(
    'denies a %s without delegated photo consent access',
    async (role) => {
      const fake = seed({ role, is_volunteer_admin: true });

      expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(fake.db.family_members[0].photo_consent).toBe(false);
      expect(fake.db.audit_logs).toEqual([]);
      expect(createAdminClient).not.toHaveBeenCalled();
    }
  );

  it('denies unauthenticated requests', async () => {
    seedFake({ authUserId: null });

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: false,
      error: 'Not authenticated',
    });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('denies a missing profile even when metadata claims admin access', async () => {
    const fake = seed();
    fake.db.profiles = [];
    fake.setAuthUser({
      id: 'actor-1',
      user_metadata: { role: 'admin', is_photo_consent_admin: true },
    });

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('uses the checked admin client to reach another family’s record', async () => {
    const db = seed({ role: 'parent', is_photo_consent_admin: true });
    const session = seedFake({
      authUserId: 'actor-1',
      data: { profiles: db.db.profiles, family_members: [] },
    });
    vi.mocked(createAdminClient).mockResolvedValue(
      db as unknown as Awaited<ReturnType<typeof createClient>>
    );

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: true,
      error: null,
    });
    expect(db.db.family_members[0].photo_consent).toBe(true);
    expect(session.db.family_members).toEqual([]);
  });

  it('rejects a non-boolean consent value', async () => {
    const fake = seed();

    expect(
      await adminUpdatePhotoConsent(student.id, 'false' as unknown as boolean)
    ).toEqual({ success: false, error: 'Invalid photo consent value' });
    expect(fake.db.family_members[0].photo_consent).toBe(false);
    expect(fake.db.audit_logs).toEqual([]);
  });

  it('reports a missing student without recording a change', async () => {
    const fake = seed();

    expect(await adminUpdatePhotoConsent('missing-student', true)).toEqual({
      success: false,
      error: 'Student not found',
    });
    expect(fake.db.audit_logs).toEqual([]);
  });

  it('only edits students who belong on the consent roster', async () => {
    const fake = seed();
    fake.db.family_members[0].relationship = 'Parent/Guardian';

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: false,
      error: 'Student not found',
    });
    expect(fake.db.family_members[0].photo_consent).toBe(false);
    expect(fake.db.audit_logs).toEqual([]);
  });

  it('does not duplicate the audit when consent already has the requested value', async () => {
    const fake = seed({}, true);

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: true,
      error: null,
    });
    expect(fake.db.audit_logs).toEqual([]);
  });

  it('reports database failures without claiming success', async () => {
    const fake = seed();
    vi.mocked(createAdminClient).mockRejectedValueOnce(
      new Error('Database unavailable')
    );

    expect(await adminUpdatePhotoConsent(student.id, true)).toEqual({
      success: false,
      error: 'Failed to update photo consent',
    });
    expect(fake.db.family_members[0].photo_consent).toBe(false);
    expect(fake.db.audit_logs).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
