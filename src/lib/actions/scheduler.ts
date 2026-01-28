'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkScheduleOverlap } from './classes';

export type UpdateTimeResult = {
    error?: string;
    success?: boolean;
};

export async function updateClassSchedule(
    classId: string,
    newTime: string,
    originalDay: string,
    newDay: string
): Promise<UpdateTimeResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Not authenticated' };
    }

    const role = user.user_metadata?.role;
    if (role !== 'admin' && role !== 'class_scheduler') {
        return { error: 'Not authorized to reschedule classes' };
    }

    // 1. Fetch current class details
    const { data: classData, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

    if (fetchError || !classData) {
        return { error: 'Class not found' };
    }

    // 2. Prepare schedule days
    let scheduleDays = Array.isArray(classData.schedule_days) 
        ? classData.schedule_days 
        : JSON.parse((classData.schedule_days as unknown as string) || '[]');
        
    scheduleDays = scheduleDays.map((d: string) => d.toLowerCase());

    const lowerOriginalDay = originalDay.toLowerCase();
    const lowerNewDay = newDay.toLowerCase();

    if (lowerOriginalDay !== lowerNewDay) {
        // Swap days
        if (scheduleDays.includes(lowerOriginalDay)) {
            scheduleDays = scheduleDays.map((d: string) => d === lowerOriginalDay ? lowerNewDay : d);
            scheduleDays = Array.from(new Set(scheduleDays));
        } else {
             console.warn(`Original day ${lowerOriginalDay} not found in class ${classId}`);
        }
    }

    const checkData = {
        startDate: classData.start_date,
        endDate: classData.end_date,
        scheduleDays: scheduleDays,
        scheduleTime: newTime
    };

    // 3. Check for overlaps
    const overlapError = await checkScheduleOverlap(
        supabase,
        classData.teacher_id,
        checkData,
        classId
    );

    if (overlapError) {
        return { error: overlapError };
    }

    // 4. Calculate new schedule text
    const formatSchedule = (days: string[], time: string) => {
        let text = '';
        if (days.length > 0) {
            const dayLabels = days.map(d => d.charAt(0).toUpperCase() + d.slice(1));
            text = dayLabels.join(', ');
        }
        if (time) {
             const [h, m] = time.split(':');
             const hour = parseInt(h);
             if (!isNaN(hour)) {
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                 text += ` at ${displayHour}:${m} ${ampm}`;
             }
        }
        return text;
    };

    const newScheduleText = formatSchedule(scheduleDays, newTime);

    // 5. Update
    const { error: updateError } = await supabase
        .from('classes')
        .update({ 
            schedule_time: newTime,
            schedule_days: scheduleDays,
            schedule: newScheduleText 
        })
        .eq('id', classId);

    if (updateError) {
        return { error: updateError.message };
    }

    revalidatePath('/class_scheduler/schedule');
    revalidatePath('/class_scheduler/classes');
    return { success: true };
}
