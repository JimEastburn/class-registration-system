'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
    error?: string;
    success?: boolean;
    data?: unknown;
};

export async function createClass(formData: FormData): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify user is a teacher
    if (user.user_metadata?.role !== 'teacher') {
        return { error: 'Only teachers can create classes' };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const schedule = formData.get('schedule') as string;
    const maxStudents = parseInt(formData.get('maxStudents') as string, 10);
    const fee = parseFloat(formData.get('fee') as string);
    const syllabus = formData.get('syllabus') as string;

    const { error } = await supabase.from('classes').insert({
        teacher_id: user.id,
        name,
        description: description || null,
        location,
        start_date: startDate,
        end_date: endDate,
        schedule,
        max_students: maxStudents,
        fee,
        syllabus: syllabus || null,
        status: 'draft',
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    return { success: true };
}

export async function updateClass(
    id: string,
    formData: FormData
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const schedule = formData.get('schedule') as string;
    const maxStudents = parseInt(formData.get('maxStudents') as string, 10);
    const fee = parseFloat(formData.get('fee') as string);
    const syllabus = formData.get('syllabus') as string;

    const { error } = await supabase
        .from('classes')
        .update({
            name,
            description: description || null,
            location,
            start_date: startDate,
            end_date: endDate,
            schedule,
            max_students: maxStudents,
            fee,
            syllabus: syllabus || null,
        })
        .eq('id', id)
        .eq('teacher_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    return { success: true };
}

export async function updateClassStatus(
    id: string,
    status: 'draft' | 'active' | 'cancelled' | 'completed'
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('classes')
        .update({ status })
        .eq('id', id)
        .eq('teacher_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    return { success: true };
}

export async function deleteClass(id: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Only allow deleting draft classes
    const { data: classData } = await supabase
        .from('classes')
        .select('status')
        .eq('id', id)
        .eq('teacher_id', user.id)
        .single();

    if (!classData) {
        return { error: 'Class not found' };
    }

    if (classData.status !== 'draft') {
        return { error: 'Only draft classes can be deleted' };
    }

    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)
        .eq('teacher_id', user.id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    return { success: true };
}

export async function blockStudent(
    classId: string,
    studentId: string,
    reason: string
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify teacher owns the class (RLS checks this too, but good for error message)
    // Actually, RLS policy "Teachers can manage blocks for their classes" handles this safely.
    // We can just try insert.

    const { error } = await supabase.from('class_blocks').insert({
        class_id: classId,
        student_id: studentId,
        reason,
        created_by: user.id
    });

    if (error) {
        return { error: error.message };
    }

    // Creating the block automatically triggers cancellation of existing enrollment 
    // via database trigger 'on_block_created'.

    revalidatePath(`/teacher/students`);
    revalidatePath(`/teacher/classes/${classId}`);
    return { success: true };
}

export async function unblockStudent(
    classId: string,
    studentId: string
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const { error } = await supabase
        .from('class_blocks')
        .delete()
        .eq('class_id', classId)
        .eq('student_id', studentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/teacher/students`);
    return { success: true };
}

export async function getStudentBlockStatus(
    classId: string,
    studentId: string
): Promise<{ blocked: boolean; reason?: string }> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('class_blocks')
        .select('reason')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .single();

    return {
        blocked: !!data,
        reason: data?.reason
    };
}
