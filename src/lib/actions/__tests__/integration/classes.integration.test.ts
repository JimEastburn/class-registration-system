import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createClass, updateClass, updateClassStatus, deleteClass } from '../../classes';
import { createClient } from '@/lib/supabase/server';
import { createTestUser, deleteTestUser, adminClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Teacher Classes Actions (Integration)', () => {
    let teacherUser: any;
    let authedTeacherClient: any;

    beforeEach(async () => {
        teacherUser = await createTestUser('teacher');

        const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
            email: teacherUser.email,
            password: teacherUser.password,
        });
        if (signInError) throw signInError;

        authedTeacherClient = createSupabaseClient(
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

        (createClient as Mock).mockResolvedValue(authedTeacherClient);
    });

    afterEach(async () => {
        if (teacherUser?.id) {
            await deleteTestUser(teacherUser.id);
        }
    });

    it('should allow a teacher to create and then publish a class', async () => {
        const formData = new FormData();
        formData.append('name', 'Integration Art');
        formData.append('description', 'Learn painting');
        formData.append('location', 'Studio A');
        formData.append('schedule', 'Tuesdays');
        formData.append('startDate', '2026-03-01');
        formData.append('endDate', '2026-04-01');
        formData.append('maxStudents', '15');
        formData.append('fee', '150');

        const createResult = await createClass(formData);
        expect(createResult.success).toBe(true);

        const { data: createdClass } = await (adminClient
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherUser.id) as any)
            .single();

        expect(createdClass).not.toBeNull();

        // Now publish it
        if (createdClass) {
            const publishResult = await updateClassStatus((createdClass as any).id, 'active');
            expect(publishResult.success).toBe(true);

            const { data: publishedClass } = await (adminClient
                .from('classes')
                .select('status')
                .eq('id', (createdClass as any).id) as any)
                .single();

            expect(publishedClass).not.toBeNull();
            if (publishedClass) {
                expect((publishedClass as any).status).toBe('active');
            }
        }
    });

    it('should allow a teacher to update their own class', async () => {
        // Pre-insert
        const { data: member } = await (adminClient
            .from('classes')
            .insert({
                teacher_id: teacherUser.id,
                name: 'Original Class',
                location: 'Original Room',
                start_date: '2026-01-01',
                end_date: '2026-02-01',
                schedule: 'Original Time',
                max_students: 5,
                fee: 50,
            } as any) as any)
            .select()
            .single();

        expect(member).not.toBeNull();

        const formData = new FormData();
        formData.append('name', 'Updated Class Name');
        formData.append('location', 'Studio B');
        formData.append('schedule', 'Wednesdays');
        formData.append('startDate', '2026-01-01');
        formData.append('endDate', '2026-02-01');
        formData.append('maxStudents', '10');
        formData.append('fee', '75');

        const result = await updateClass((member as any).id, formData);
        expect(result.success).toBe(true);

        const { data: updated } = await (adminClient
            .from('classes')
            .select('name, max_students')
            .eq('id', (member as any).id) as any)
            .single();

        expect(updated).not.toBeNull();
        if (updated) {
            expect((updated as any).name).toBe('Updated Class Name');
            expect((updated as any).max_students).toBe(10);
        }
    });

    it('should allow a teacher to delete only draft classes', async () => {
        // 1. Create a draft class
        const { data: draftClass } = await (adminClient
            .from('classes')
            .insert({
                teacher_id: teacherUser.id,
                name: 'Draft Class',
                location: 'Room 1',
                start_date: '2026-01-01',
                end_date: '2026-02-01',
                schedule: 'Time',
                max_students: 5,
                fee: 50,
                status: 'draft'
            } as any) as any)
            .select()
            .single();

        expect(draftClass).not.toBeNull();

        const deleteDraftResult = await deleteClass((draftClass as any).id);
        expect(deleteDraftResult.success).toBe(true);

        // 2. Create an active class
        const { data: activeClass } = await (adminClient
            .from('classes')
            .insert({
                teacher_id: teacherUser.id,
                name: 'Active Class',
                location: 'Room 2',
                start_date: '2026-01-01',
                end_date: '2026-02-01',
                schedule: 'Time',
                max_students: 5,
                fee: 50,
                status: 'active'
            } as any) as any)
            .select()
            .single();

        expect(activeClass).not.toBeNull();

        const deleteActiveResult = await deleteClass((activeClass as any).id);
        expect(deleteActiveResult.error).toBeDefined();

        const { data: stillExists } = await (adminClient
            .from('classes')
            .select('*')
            .eq('id', (activeClass as any).id) as any)
            .single();

        expect(stillExists).not.toBeNull();
    });
});
