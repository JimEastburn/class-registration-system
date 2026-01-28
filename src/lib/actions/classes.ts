'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

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

    // Verify user is a teacher or has scheduling privileges
    const role = user.user_metadata?.role;
    if (role !== 'teacher' && role !== 'admin' && role !== 'class_scheduler') {
        return { error: 'Not authorized to create classes' };
    }

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    let location = formData.get('location') as string;
    let startDate = formData.get('startDate') as string;
    let endDate = formData.get('endDate') as string;
    let schedule = formData.get('schedule') as string;
    const maxStudents = parseInt(formData.get('maxStudents') as string, 10);
    const fee = parseFloat(formData.get('fee') as string);
    const syllabus = formData.get('syllabus') as string;

    // Determine teacher ID
    let teacherId = user.id;
    if (role === 'admin' || role === 'class_scheduler') {
        const providedTeacherId = formData.get('teacherId') as string;
        if (providedTeacherId) {
            teacherId = providedTeacherId;
        }
    }

    // Force "To Be Announced" for teachers (unless admin is setting it?)
    // If admin is creating, they might want to set schedule? 
    // The current requirement focuses on assignment. 
    // Let's keep existing logic: if "teacher" role creates, it is forced.
    // If admin creates, they can set schedule.
    if (role === 'teacher') {
        schedule = 'To Be Announced';
        // Teachers cannot set these fields, so provide defaults
        location = 'To Be Announced';
        // Use placeholder dates that can be updated by admin later
        startDate = new Date().toISOString().split('T')[0]; // Today
        endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]; // One year from now
    }

    const scheduleDaysStr = formData.get('schedule_days') as string;
    const scheduleTime = formData.get('schedule_time') as string;

    let scheduleDays: string[] | null = null;
    if (scheduleDaysStr) {
        try {
            scheduleDays = JSON.parse(scheduleDaysStr);
        } catch (e) {
            console.error('Failed to parse schedule_days', e);
        }
    }

    // Check for schedule overlaps
    if (scheduleDays && scheduleTime) {
        const overlapError = await checkScheduleOverlap(
            supabase,
            teacherId,
            {
                startDate,
                endDate,
                scheduleDays,
                scheduleTime
            },
        );

        if (overlapError) {
            return { error: overlapError };
        }
    }

    const { error } = await supabase.from('classes').insert({
        teacher_id: teacherId,
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
        schedule_days: scheduleDays,
        schedule_time: scheduleTime || null,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    revalidatePath('/class_scheduler/classes');
    revalidatePath('/class_scheduler/schedule');
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

    const role = user.user_metadata?.role;

    // Build update object
    const updateData: any = {
        name,
        description: description || null,
        location,
        start_date: startDate,
        end_date: endDate,
        max_students: maxStudents,
        fee,
        syllabus: syllabus || null,
    };

    const scheduleDaysStr = formData.get('schedule_days') as string;
    const scheduleTime = formData.get('schedule_time') as string;

    if (scheduleDaysStr) {
        try {
            updateData.schedule_days = JSON.parse(scheduleDaysStr);
        } catch (e) {
            console.error('Failed to parse schedule_days', e);
        }
    } else {
        updateData.schedule_days = null;
    }

    updateData.schedule_time = scheduleTime || null;

    // Handle teacher update for admins/schedulers
    if (role === 'admin' || role === 'class_scheduler') {
        const teacherId = formData.get('teacherId') as string;
        if (teacherId) {
            updateData.teacher_id = teacherId;
        }
    }

    // Allow updating schedule text to keep it in sync with schedule fields
    updateData.schedule = schedule;

    // Check for overlaps if schedule fields are present OR teacher is changing
    if ((updateData.schedule_days && updateData.schedule_time) || updateData.teacher_id) {
        let teacherIdToCheck = updateData.teacher_id;

        if (!teacherIdToCheck) {
            if (role === 'teacher') {
                teacherIdToCheck = user.id;
            } else {
                const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', id).single();
                if (cls) {
                    teacherIdToCheck = cls.teacher_id;
                }
            }
        }
        
        if (teacherIdToCheck) {
            const overlapError = await checkScheduleOverlap(
                supabase,
                teacherIdToCheck,
                {
                    startDate: updateData.start_date || startDate,
                    endDate: updateData.end_date || endDate,
                    scheduleDays: updateData.schedule_days,
                    scheduleTime: updateData.schedule_time
                },
                id
            );

            if (overlapError) {
                return { error: overlapError };
            }
        }
    }

    let query = supabase.from('classes').update(updateData).eq('id', id);

    // If not admin or scheduler, ensure they own the class
    if (role !== 'admin' && role !== 'class_scheduler') {
        query = query.eq('teacher_id', user.id);
    }

    const { error } = await query;

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    revalidatePath('/class_scheduler/classes');
    revalidatePath('/class_scheduler/schedule');
    revalidatePath(`/class_scheduler/classes/${id}`);
    revalidatePath(`/teacher/classes/${id}`);
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

    const role = user.user_metadata?.role;
    let query = supabase.from('classes').update({ status }).eq('id', id);

    if (role !== 'admin' && role !== 'class_scheduler') {
        query = query.eq('teacher_id', user.id);
    }

    const { error } = await query;

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
    const role = user.user_metadata?.role;

    let checkQuery = supabase.from('classes').select('status').eq('id', id);
    if (role !== 'admin' && role !== 'class_scheduler') {
        checkQuery = checkQuery.eq('teacher_id', user.id);
    }
    const { data: classData } = await checkQuery.single();

    if (!classData) {
        return { error: 'Class not found' };
    }

    if (classData.status !== 'draft') {
        return { error: 'Only draft classes can be deleted' };
    }

    let deleteQuery = supabase.from('classes').delete().eq('id', id);
    if (role !== 'admin' && role !== 'class_scheduler') {
        deleteQuery = deleteQuery.eq('teacher_id', user.id);
    }
    const { error } = await deleteQuery;

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/teacher/classes');
    revalidatePath('/class_scheduler/classes');
    revalidatePath('/class_scheduler/schedule');
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

// Helper to check for schedule overlaps
export async function checkScheduleOverlap(
    supabase: SupabaseClient<Database>,
    teacherId: string,
    newClass: {
        startDate: string;
        endDate: string;
        scheduleDays: string[] | null;
        scheduleTime: string | null;
    },
    excludeClassId?: string
): Promise<string | null> {
    // If no specific schedule is set, skip validation
    if (!newClass.scheduleDays || !newClass.scheduleTime) {
        return null; 
    }

    // 1. Fetch all active/draft classes for this teacher
    let query = supabase
        .from('classes')
        .select('id, name, start_date, end_date, schedule_days, schedule_time')
        .eq('teacher_id', teacherId)
        .neq('status', 'cancelled');

    if (excludeClassId) {
        query = query.neq('id', excludeClassId);
    }

    const { data, error } = await query;

    if (error || !data) {
        console.error('Error fetching classes for overlap check:', error);
        return null;
    }

    type ClassSchedule = {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        schedule_days: string[] | string | null;
        schedule_time: string | null;
    };
    
    const existingClasses = data as unknown as ClassSchedule[];

    const newStart = new Date(newClass.startDate);
    const newEnd = new Date(newClass.endDate);

    for (const existing of existingClasses) {
        if (!existing.schedule_days || !existing.schedule_time) {
            continue;
        }

        // 1. Check date range overlap
        const exStart = new Date(existing.start_date);
        const exEnd = new Date(existing.end_date);

        const dateOverlap = (newStart <= exEnd) && (newEnd >= exStart);
        if (!dateOverlap) continue;

        // 2. Check day overlap
        const exDays = Array.isArray(existing.schedule_days) 
            ? existing.schedule_days as string[]
            : JSON.parse((existing.schedule_days as unknown as string) || '[]');
            
        const dayOverlap = newClass.scheduleDays.some(day => exDays.includes(day));
        if (!dayOverlap) continue;

        // 3. Check time overlap - exact match (since we use block times)
        if (newClass.scheduleTime === existing.schedule_time) {
            return `Teacher already has a class scheduled at this time: ${existing.name}`;
        }
    }

    return null;
}
