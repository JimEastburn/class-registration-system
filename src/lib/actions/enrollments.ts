'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = {
    error?: string;
    success?: boolean;
    data?: unknown;
};

export async function createEnrollment(
    studentId: string,
    classId: string
): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify parent owns this student
    const { data: student } = await supabase
        .from('family_members')
        .select('id')
        .eq('id', studentId)
        .eq('parent_id', user.id)
        .single();

    if (!student) {
        return { error: 'Student not found' };
    }

    // Check if class is active and has capacity
    const { data: classData } = await supabase
        .from('classes')
        .select('id, status, max_students, current_enrollment')
        .eq('id', classId)
        .single();

    if (!classData) {
        return { error: 'Class not found' };
    }

    if (classData.status !== 'active') {
        return { error: 'Class is not accepting enrollments' };
    }

    if (classData.current_enrollment >= classData.max_students) {
        return { error: 'Class is full' };
    }

    // Check for existing enrollment
    const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .single();

    if (existingEnrollment) {
        return { error: 'Student is already enrolled in this class' };
    }

    // Create enrollment
    const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        class_id: classId,
        status: 'pending',
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/enrollments');
    revalidatePath('/parent/classes');
    return { success: true };
}

export async function cancelEnrollment(enrollmentId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify parent owns this enrollment through the student
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      student:family_members!inner(parent_id)
    `)
        .eq('id', enrollmentId)
        .single();

    if (!enrollment) {
        return { error: 'Enrollment not found' };
    }

    const student = enrollment.student as unknown as { parent_id: string };
    if (student.parent_id !== user.id) {
        return { error: 'Not authorized' };
    }

    if (enrollment.status === 'cancelled') {
        return { error: 'Enrollment is already cancelled' };
    }

    // Update enrollment status to cancelled
    const { error } = await supabase
        .from('enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/enrollments');
    return { success: true };
}

export async function confirmEnrollment(enrollmentId: string): Promise<ActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    // Verify parent owns this enrollment
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      student:family_members!inner(parent_id)
    `)
        .eq('id', enrollmentId)
        .single();

    if (!enrollment) {
        return { error: 'Enrollment not found' };
    }

    const student = enrollment.student as unknown as { parent_id: string };
    if (student.parent_id !== user.id) {
        return { error: 'Not authorized' };
    }

    if (enrollment.status !== 'pending') {
        return { error: 'Only pending enrollments can be confirmed' };
    }

    // Update enrollment status to confirmed
    const { error } = await supabase
        .from('enrollments')
        .update({ status: 'confirmed' })
        .eq('id', enrollmentId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/parent/enrollments');
    return { success: true };
}
