import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createEnrollment, cancelEnrollment } from '../../enrollments';
import { createClient } from '@/lib/supabase/server';
import { createTestUser, deleteTestUser, getAdminClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Enrollments Actions (Integration)', () => {
    let parentUser: any;
    let studentId: string;
    let classId: string;
    let authedParentClient: any;
    let teacherUser: any;

    beforeEach(async () => {
        const admin = getAdminClient();
        // 1. Create teacher and a class
        teacherUser = await createTestUser('teacher');
        const { data: testClass } = await (admin
            .from('classes')
            .insert({
                teacher_id: teacherUser.id,
                name: 'Enrollment Test Class',
                location: 'Main Hall',
                start_date: '2026-05-01',
                end_date: '2026-06-01',
                schedule: 'Fridays',
                max_students: 2,
                fee: 250,
                status: 'active'
            } as any) as any)
            .select()
            .single();

        expect(testClass).not.toBeNull();
        classId = (testClass as any).id;

        // 2. Create parent and a family member (student)
        parentUser = await createTestUser('parent');
        const { data: student } = await (admin
            .from('family_members')
            .insert({
                parent_id: parentUser.id,
                first_name: 'Student',
                last_name: 'Test',
                relationship: 'child',
            } as any) as any)
            .select()
            .single();

        expect(student).not.toBeNull();
        studentId = (student as any).id;

        // 3. Setup auth - use a FRESH client for sign-in to avoid pollution
        const authClient = getAdminClient();
        const { data: signInData } = await authClient.auth.signInWithPassword({
            email: parentUser.email,
            password: parentUser.password,
        });

        expect(signInData.session).not.toBeNull();

        authedParentClient = createSupabaseClient(
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

        (createClient as Mock).mockResolvedValue(authedParentClient);
    });

    afterEach(async () => {
        if (parentUser?.id) await deleteTestUser(parentUser.id);
        if (teacherUser?.id) await deleteTestUser(teacherUser.id);
    });

    it('should successfully enroll a blooming student into an active class', async () => {
        const result = await createEnrollment(studentId, classId);

        expect(result.success).toBe(true);

        const { data: enrollment, error } = await (getAdminClient()
            .from('enrollments')
            .select('*')
            .eq('student_id', studentId)
            .eq('class_id', classId) as any)
            .single();

        expect(error).toBeNull();
        expect(enrollment).not.toBeNull();
        if (enrollment) {
            expect((enrollment as any).status).toBe('pending');
        }
    });

    it('should allow a parent to cancel their childs enrollment', async () => {
        // Pre-enroll
        const { data: enrollment } = await (getAdminClient()
            .from('enrollments')
            .insert({
                student_id: studentId,
                class_id: classId,
                status: 'pending'
            } as any) as any)
            .select()
            .single();

        expect(enrollment).not.toBeNull();

        const result = await cancelEnrollment((enrollment as any).id);
        expect(result.success).toBe(true);

        const { data: updated } = await (getAdminClient()
            .from('enrollments')
            .select('status')
            .eq('id', (enrollment as any).id) as any)
            .single();

        expect(updated).not.toBeNull();
        if (updated) {
            expect((updated as any).status).toBe('cancelled');
        }
    });

    it('should respect class capacity (negative test)', async () => {
        // Class has capacity 2. Let's fill it.
        const p1 = await createTestUser('parent');
        const p2 = await createTestUser('parent');
        const admin = getAdminClient();

        const { data: s1 } = await (admin.from('family_members').insert({ parent_id: p1.id, first_name: 'S1', last_name: 'X', relationship: 'child' } as any) as any).select().single();
        const { data: s2 } = await (admin.from('family_members').insert({ parent_id: p2.id, first_name: 'S2', last_name: 'X', relationship: 'child' } as any) as any).select().single();

        await (admin.from('enrollments').insert([
            { student_id: (s1 as any).id, class_id: classId, status: 'confirmed' },
            { student_id: (s2 as any).id, class_id: classId, status: 'confirmed' },
        ] as any) as any);

        // Attempt to enroll our test student
        const result = await createEnrollment(studentId, classId);

        expect(result.error).toBeDefined();
        expect(result.error).toMatch(/full|capacity/i);

        await deleteTestUser(p1.id);
        await deleteTestUser(p2.id);
    });
});
