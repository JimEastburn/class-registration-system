import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createTestUser, deleteTestUser, getAdminClient, getAuthenticatedClient } from './utils';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Student Access (Integration)', () => {
    let parentUser: { id: string; email: string; password: string };
    let studentUser: { id: string; email: string; password: string };
    let teacherUser: { id: string };
    let familyMemberId: string;
    let classId: string;
    let enrollmentId: string;

    beforeEach(async () => {
        const admin = getAdminClient();

        // 1. Create teacher and a class
        teacherUser = await createTestUser('teacher');
        const { data: testClass } = await admin
            .from('classes')
            .insert({
                teacher_id: teacherUser.id,
                name: 'Student Access Test Class',
                location: 'Room 101',
                start_date: '2026-05-01',
                end_date: '2026-06-01',
                schedule: 'Mondays',
                max_students: 10,
                fee: 100,
                status: 'active',
            })
            .select()
            .single();

        expect(testClass).not.toBeNull();
        classId = testClass!.id;

        // 2. Create parent and a family member
        parentUser = await createTestUser('parent');
        const { data: familyMember } = await admin
            .from('family_members')
            .insert({
                parent_id: parentUser.id,
                first_name: 'TestKid',
                last_name: 'StudentAccess',
                relationship: 'child',
            })
            .select()
            .single();

        expect(familyMember).not.toBeNull();
        familyMemberId = familyMember!.id;

        // 3. Create enrollment for the family member
        const { data: enrollment } = await admin
            .from('enrollments')
            .insert({
                student_id: familyMemberId,
                class_id: classId,
                status: 'confirmed',
            })
            .select()
            .single();

        expect(enrollment).not.toBeNull();
        enrollmentId = enrollment!.id;

        // 4. Create student account
        studentUser = await createTestUser('student');

        // 5. Link student account to family member
        const { error: linkError } = await admin
            .from('family_members')
            .update({ user_id: studentUser.id })
            .eq('id', familyMemberId);

        expect(linkError).toBeNull();
    });

    afterEach(async () => {
        if (parentUser?.id) await deleteTestUser(parentUser.id);
        if (studentUser?.id) await deleteTestUser(studentUser.id);
        if (teacherUser?.id) await deleteTestUser(teacherUser.id);
    });

    it('should allow a linked student to view their own enrollments', async () => {
        const admin = getAdminClient();

        // Sign in as student
        const { data: signInData } = await admin.auth.signInWithPassword({
            email: studentUser.email,
            password: studentUser.password,
        });

        expect(signInData.session).not.toBeNull();

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

        // Query enrollments as student
        const { data: enrollments, error } = await studentClient
            .from('enrollments')
            .select('id, status, class:classes(name)')
            .eq('status', 'confirmed');

        expect(error).toBeNull();
        expect(enrollments).not.toBeNull();
        expect(enrollments!.length).toBe(1);
        expect(enrollments![0].id).toBe(enrollmentId);
    });

    it('should allow a linked student to view their enrolled class', async () => {
        const admin = getAdminClient();

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

        // Query classes as student
        const { data: classes, error } = await studentClient
            .from('classes')
            .select('id, name')
            .eq('id', classId);

        expect(error).toBeNull();
        expect(classes).not.toBeNull();
        expect(classes!.length).toBe(1);
        expect(classes![0].name).toBe('Student Access Test Class');
    });

    it('should NOT allow an unlinked student to view other enrollments', async () => {
        // Create a second student who is NOT linked to any family member
        const unlinkedStudent = await createTestUser('student');
        const admin = getAdminClient();

        const { data: signInData } = await admin.auth.signInWithPassword({
            email: unlinkedStudent.email,
            password: unlinkedStudent.password,
        });

        const unlinkedStudentClient = createSupabaseClient(
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

        // Query enrollments - should return empty
        const { data: enrollments, error } = await unlinkedStudentClient
            .from('enrollments')
            .select('id, status');

        expect(error).toBeNull();
        expect(enrollments).not.toBeNull();
        expect(enrollments!.length).toBe(0);

        await deleteTestUser(unlinkedStudent.id);
    });
});
