import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { addFamilyMember, updateFamilyMember, deleteFamilyMember } from '../../family';
import { createClient } from '@/lib/supabase/server';
import { createTestUser, deleteTestUser, adminClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Mock the server client creation to return our authed test client
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Family Actions (Integration)', () => {
    let testUser: any;
    let authedClient: any;

    beforeEach(async () => {
        // 1. Create a fresh test user
        testUser = await createTestUser('parent');

        // 2. Sign in the user to get a session/token
        const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
            email: testUser.email,
            password: testUser.password,
        });
        if (signInError) throw signInError;

        // 3. Create a real client with this user's access token
        authedClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${signInData.session.access_token}`,
                    },
                },
            }
        );

        // 4. Mock createClient() to return this authed client
        (createClient as Mock).mockResolvedValue(authedClient);
    });

    afterEach(async () => {
        // Clean up the test user and their family members (cascades)
        if (testUser?.id) {
            await deleteTestUser(testUser.id);
        }
    });

    it('should successfully add a family member to the real database', async () => {
        const formData = new FormData();
        formData.append('firstName', 'Integration');
        formData.append('lastName', 'Test');
        formData.append('relationship', 'child');
        formData.append('gradeLevel', '8');

        const result = await addFamilyMember(formData);

        expect(result.success).toBe(true);

        // Verify in DB
        const { data, error } = await (adminClient
            .from('family_members')
            .select('*')
            .eq('parent_id', testUser.id) as any)
            .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        if (data) {
            expect((data as any).first_name).toBe('Integration');
            expect((data as any).grade_level).toBe('8');
        }
    });

    it('should successfully update an existing family member', async () => {
        // Pre-insert a family member directly
        const { data: member } = await (adminClient
            .from('family_members')
            .insert({
                parent_id: testUser.id,
                first_name: 'Original',
                last_name: 'Name',
                relationship: 'child',
            } as any) as any)
            .select()
            .single();

        expect(member).not.toBeNull();

        const formData = new FormData();
        formData.append('firstName', 'Updated');
        formData.append('lastName', 'Name');
        formData.append('relationship', 'child');

        const result = await updateFamilyMember((member as any).id, formData);

        expect(result.success).toBe(true);

        // Verify update
        const { data } = await (adminClient
            .from('family_members')
            .select('first_name')
            .eq('id', (member as any).id) as any)
            .single();

        expect(data).not.toBeNull();
        if (data) {
            expect((data as any).first_name).toBe('Updated');
        }
    });

    it('should successfully delete a family member', async () => {
        // Pre-insert
        const { data: member } = await (adminClient
            .from('family_members')
            .insert({
                parent_id: testUser.id,
                first_name: 'To Delete',
                last_name: 'Name',
                relationship: 'child',
            } as any) as any)
            .select()
            .single();

        expect(member).not.toBeNull();

        const result = await deleteFamilyMember((member as any).id);

        expect(result.success).toBe(true);

        // Verify deletion
        const { data } = await (adminClient
            .from('family_members')
            .select('*')
            .eq('id', (member as any).id) as any)
            .single();

        expect(data).toBeNull();
    });

    it('should prevent deleting a family member that belongs to another user', async () => {
        // Create another user and member
        const otherUser = await createTestUser('parent');
        const { data: otherMember } = await (adminClient
            .from('family_members')
            .insert({
                parent_id: otherUser.id,
                first_name: 'Other',
                last_name: 'User Member',
                relationship: 'child',
            } as any) as any)
            .select()
            .single();

        expect(otherMember).not.toBeNull();

        // Attempt to delete as the primary testUser
        const result = await deleteFamilyMember((otherMember as any).id);

        // Standard result is success: true if RLS allows the query but deletes 0 rows
        expect(result.success).toBe(true);

        // Let's check if the member still exists.
        const { data } = await (adminClient
            .from('family_members')
            .select('*')
            .eq('id', (otherMember as any).id) as any)
            .single();

        expect(data).not.toBeNull();
        if (data) {
            expect((data as any).id).toBe((otherMember as any).id);
        }

        // Cleanup other user
        await deleteTestUser(otherUser.id);
    });
});
