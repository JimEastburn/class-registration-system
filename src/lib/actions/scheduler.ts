'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkScheduleOverlap } from './classes';

export type UpdateTimeResult = {
    error?: string;
    success?: boolean;
};

export async function updateClassTime(
    classId: string,
    newTime: string
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

    // 2. Prepare data for overlap check
    // We assume duration stays same.
    // We assume days stay same.
    
    const recurrenceDays = Array.isArray(classData.recurrence_days) 
        ? classData.recurrence_days 
        : JSON.parse((classData.recurrence_days as unknown as string) || '[]');

    const checkData = {
        startDate: classData.start_date,
        endDate: classData.end_date,
        recurrenceDays: recurrenceDays,
        recurrenceTime: newTime,
        recurrenceDuration: classData.recurrence_duration
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
    // We need to import the helper first (will do via separate edit or just inline if this is single file)
    // Actually I can import it.
    
    // logic to format
    const formatSchedule = (pattern: string, days: string[], time: string) => {
        let text = pattern.charAt(0).toUpperCase() + pattern.slice(1);
        if (days.length > 0) {
            const dayLabels = days.map(d => d.charAt(0).toUpperCase() + d.slice(1));
            text += ` on ${dayLabels.join(', ')}`;
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

    const newScheduleText = formatSchedule(
        classData.recurrence_pattern || 'weekly', 
        recurrenceDays,
        newTime
    );

    // 5. Update
    const { error: updateError } = await supabase
        .from('classes')
        .update({ 
            recurrence_time: newTime,
            schedule: newScheduleText 
        })
        .eq('id', classId);

    if (updateError) {
        return { error: updateError.message };
    }

    revalidatePath('/class_scheduler/schedule');
    return { success: true };
}
