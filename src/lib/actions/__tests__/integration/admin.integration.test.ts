import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { updateUserRole, deleteUser, adminUpdateClass } from '../../admin';
import { createClient } from '@/lib/supabase/server';
import { createTestUser, deleteTestUser, getAdminClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Admin Actions (Integration)', () => {
    let adminUser: any;
    let authedAdminClient: any;

    beforeEach(async () => {
        // Create an admin user
        adminUser = await createTestUser('admin');

        // Use a fresh client for sign-in to avoid polluting the setup client
        const authClient = getAdminClient();
        const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
            email: adminUser.email,
            password: adminUser.password,
        });
        if (signInError) throw signInError;

        authedAdminClient = createSupabaseClient(
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

        (createClient as Mock).mockResolvedValue(authedAdminClient);
    });

    afterEach(async () => {
        if (adminUser?.id) {
            await deleteTestUser(adminUser.id);
        }
    });

    it('should allow an admin to update a users role', async () => {
        // Create a target user (parent)
        const targetUser = await createTestUser('parent');

        const result = await updateUserRole(targetUser.id, 'teacher');

        expect(result.success).toBe(true);

        // Verify in DB
        const { data } = await (getAdminClient()
            .from('profiles')
            .select('role')
            .eq('id', targetUser.id) as any)
            .single();

        expect(data).not.toBeNull();
        if (data) {
            expect((data as any).role).toBe('teacher');
        }

        // Cleanup
        await deleteTestUser(targetUser.id);
    });

    it('should promote a user and then revoke their access (implicit status check)', async () => {
        const targetUser = await createTestUser('student');

        // Promote to teacher
        await updateUserRole(targetUser.id, 'teacher');
        let { data: profile } = await (getAdminClient().from('profiles').select('role').eq('id', targetUser.id) as any).single();
        expect(profile).not.toBeNull();
        if (profile) {
            expect((profile as any).role).toBe('teacher');
        }

        // Demote back to student
        await updateUserRole(targetUser.id, 'student');
        ({ data: profile } = await (getAdminClient().from('profiles').select('role').eq('id', targetUser.id) as any).single());
        expect(profile).not.toBeNull();
        if (profile) {
            expect((profile as any).role).toBe('student');
        }

        await deleteTestUser(targetUser.id);
    });

    it('should allow an admin to update any class', async () => {
        // Create a teacher and a class
        const teacher = await createTestUser('teacher');
        const { data: newClass } = await (getAdminClient()
            .from('classes')
            .insert({
                teacher_id: teacher.id,
                name: 'Admin Test Class',
                location: 'Room 101',
                start_date: '2026-01-01',
                end_date: '2026-02-01',
                schedule: 'Mondays',
                max_students: 10,
                fee: 100,
                status: 'draft'
            } as any) as any)
            .select()
            .single();

        expect(newClass).not.toBeNull();

        const result = await adminUpdateClass((newClass as any).id, {
            name: 'Updated by Admin',
            status: 'active'
        });

        expect(result.success).toBe(true);

        const { data: updatedClass } = await (getAdminClient()
            .from('classes')
            .select('name, status')
            .eq('id', (newClass as any).id) as any)
            .single();

        expect(updatedClass).not.toBeNull();
        if (updatedClass) {
            expect((updatedClass as any).name).toBe('Updated by Admin');
            expect((updatedClass as any).status).toBe('active');
        }

        await deleteTestUser(teacher.id);
    });
});
