import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { generateFamilyInviteCode, redeemFamilyInviteCode } from '../../invites';
import { createTestUser, deleteTestUser, getAdminClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Invite Code Actions (Integration)', () => {
    let parentUser: { id: string; email: string; password: string };
    let studentUser: { id: string; email: string; password: string };
    let familyMemberId: string;

    beforeEach(async () => {
        const admin = getAdminClient();

        // 1. Create parent and a family member
        parentUser = await createTestUser('parent');
        const { data: familyMember } = await admin
            .from('family_members')
            .insert({
                parent_id: parentUser.id,
                first_name: 'InviteTest',
                last_name: 'Student',
                relationship: 'child',
            })
            .select()
            .single();

        expect(familyMember).not.toBeNull();
        familyMemberId = familyMember!.id;

        // 2. Create student account
        studentUser = await createTestUser('student');
    });

    afterEach(async () => {
        if (parentUser?.id) await deleteTestUser(parentUser.id);
        if (studentUser?.id) await deleteTestUser(studentUser.id);
    });

    it('should allow a parent to generate an invite code for their family member', async () => {
        const admin = getAdminClient();

        // Sign in as parent
        const { data: signInData } = await admin.auth.signInWithPassword({
            email: parentUser.email,
            password: parentUser.password,
        });

        const parentClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session!.access_token}`,
                    },
                },
            }
        );

        (createClient as Mock).mockResolvedValue(parentClient);

        const result = await generateFamilyInviteCode(familyMemberId);

        expect(result.success).toBe(true);
        expect(result.code).toBeDefined();
        expect(result.code).toHaveLength(6);
    });

    it('should allow a student to redeem an invite code and get linked', async () => {
        const admin = getAdminClient();

        // First, create an invite code as admin
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const testCode = 'TEST12';
        await admin.from('family_member_invites').insert({
            family_member_id: familyMemberId,
            code: testCode,
            created_by: parentUser.id,
            expires_at: expiresAt.toISOString(),
        });

        // Sign in as student
        const { data: signInData } = await admin.auth.signInWithPassword({
            email: studentUser.email,
            password: studentUser.password,
        });

        const studentClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session!.access_token}`,
                    },
                },
            }
        );

        (createClient as Mock).mockResolvedValue(studentClient);

        const result = await redeemFamilyInviteCode(testCode);

        expect(result.success).toBe(true);

        // Verify the link was created
        const { data: linkedMember } = await admin
            .from('family_members')
            .select('user_id')
            .eq('id', familyMemberId)
            .single();

        expect(linkedMember?.user_id).toBe(studentUser.id);
    });

    it('should reject expired invite codes', async () => {
        const admin = getAdminClient();

        // Create an expired invite code
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

        const testCode = 'EXPIR1';
        await admin.from('family_member_invites').insert({
            family_member_id: familyMemberId,
            code: testCode,
            created_by: parentUser.id,
            expires_at: expiredDate.toISOString(),
        });

        // Sign in as student
        const { data: signInData } = await admin.auth.signInWithPassword({
            email: studentUser.email,
            password: studentUser.password,
        });

        const studentClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session!.access_token}`,
                    },
                },
            }
        );

        (createClient as Mock).mockResolvedValue(studentClient);

        const result = await redeemFamilyInviteCode(testCode);

        expect(result.error).toBeDefined();
        expect(result.error).toMatch(/expired/i);
    });

    it('should reject already used invite codes', async () => {
        const admin = getAdminClient();

        // Create an already redeemed invite code
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const testCode = 'USED01';
        await admin.from('family_member_invites').insert({
            family_member_id: familyMemberId,
            code: testCode,
            created_by: parentUser.id,
            expires_at: expiresAt.toISOString(),
            redeemed_at: new Date().toISOString(),
            redeemed_by: parentUser.id, // Already redeemed
        });

        // Sign in as student
        const { data: signInData } = await admin.auth.signInWithPassword({
            email: studentUser.email,
            password: studentUser.password,
        });

        const studentClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session!.access_token}`,
                    },
                },
            }
        );

        (createClient as Mock).mockResolvedValue(studentClient);

        const result = await redeemFamilyInviteCode(testCode);

        expect(result.error).toBeDefined();
        expect(result.error).toMatch(/already been used/i);
    });
});
