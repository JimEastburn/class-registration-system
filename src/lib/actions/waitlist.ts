'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type WaitlistResult = {
    error?: string;
    success?: boolean;
    position?: number;
};

export async function joinWaitlist(classId: string, studentId: string): Promise<WaitlistResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Please log in to join the waitlist' };
    }

    // Verify the student belongs to this parent
    const { data: student } = await supabase
        .from('family_members')
        .select('id, parent_id')
        .eq('id', studentId)
        .single();

    if (!student || student.parent_id !== user.id) {
        return { error: 'Student not found or access denied' };
    }

    // Check if class is actually full
    const { data: classData } = await supabase
        .from('classes')
        .select('id, name, current_enrollment, max_students, status')
        .eq('id', classId)
        .single();

    if (!classData) {
        return { error: 'Class not found' };
    }

    if (classData.status !== 'active') {
        return { error: 'Class is not accepting enrollments' };
    }

    if (classData.current_enrollment < classData.max_students) {
        return { error: 'Class has available spots - please enroll directly' };
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .not('status', 'eq', 'cancelled')
        .single();

    if (existingEnrollment) {
        return { error: 'Student is already enrolled in this class' };
    }

    // Check if already on waitlist
    const { data: existingWaitlist } = await supabase
        .from('waitlist')
        .select('id, position')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .eq('status', 'waiting')
        .single();

    if (existingWaitlist) {
        return { error: `Student is already on the waitlist (position ${existingWaitlist.position})` };
    }

    // Get next position
    const { data: maxPositionData } = await supabase
        .from('waitlist')
        .select('position')
        .eq('class_id', classId)
        .eq('status', 'waiting')
        .order('position', { ascending: false })
        .limit(1)
        .single();

    const nextPosition = (maxPositionData?.position || 0) + 1;

    // Add to waitlist
    const { error } = await supabase
        .from('waitlist')
        .insert({
            class_id: classId,
            student_id: studentId,
            parent_id: user.id,
            position: nextPosition,
            status: 'waiting',
        });

    if (error) {
        console.error('Waitlist error:', error);
        return { error: 'Failed to join waitlist' };
    }

    revalidatePath('/parent/classes');
    revalidatePath(`/parent/classes/${classId}`);

    return { success: true, position: nextPosition };
}

export async function leaveWaitlist(waitlistId: string): Promise<WaitlistResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Please log in' };
    }

    // Update status to cancelled
    const { error } = await supabase
        .from('waitlist')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', waitlistId)
        .eq('parent_id', user.id);

    if (error) {
        return { error: 'Failed to leave waitlist' };
    }

    revalidatePath('/parent/classes');

    return { success: true };
}

export async function getWaitlistPosition(classId: string, studentId: string) {
    const supabase = await createClient();

    const { data } = await supabase
        .from('waitlist')
        .select('id, position, status, created_at')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .eq('status', 'waiting')
        .single();

    return data;
}

export async function getClassWaitlistCount(classId: string): Promise<number> {
    const supabase = await createClient();

    const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'waiting');

    return count || 0;
}
