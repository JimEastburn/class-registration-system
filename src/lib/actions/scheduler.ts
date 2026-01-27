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

    // 2. Prepare recurrence days
    // Logic: 
    // If originalDay === newDay, we are just changing time for ALL days (as per legacy logic)
    // BUT, the new UI implies moving a specific BLOCK.
    // If I move the "Tuesday" block to "2:00 PM", should "Thursday" block also move to "2:00 PM"?
    // Yes, for now, recurrence_time is global for the class.
    // However, if I move "Tuesday" block to "Wednesday", what happens?
    // "Tuesday" should become "Wednesday". "Thursday" should remain "Thursday".
    
    let recurrenceDays = Array.isArray(classData.recurrence_days) 
        ? classData.recurrence_days 
        : JSON.parse((classData.recurrence_days as unknown as string) || '[]');
        
    recurrenceDays = recurrenceDays.map((d: string) => d.toLowerCase());

    const lowerOriginalDay = originalDay.toLowerCase();
    const lowerNewDay = newDay.toLowerCase();

    if (lowerOriginalDay !== lowerNewDay) {
        // Swap days
        if (recurrenceDays.includes(lowerOriginalDay)) {
            recurrenceDays = recurrenceDays.map((d: string) => d === lowerOriginalDay ? lowerNewDay : d);
            
            // Deduplicate (e.g. if moving Tue to Thu and Thu already exists?)
            // If Thu already exists, we merge?
            // "Tue/Thu" -> move Tue to Thu -> "Thu/Thu" -> "Thu".
            // Logic: strictly unique days.
            recurrenceDays = Array.from(new Set(recurrenceDays));
        } else {
             // Fallback: If original day not found (shouldn't happen given UI), just add new day?
             // Or maybe invalid request.
             // Let's safe-fail or just proceed.
             console.warn(`Original day ${lowerOriginalDay} not found in class ${classId}`);
        }
    }

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
            recurrence_days: recurrenceDays,
            schedule: newScheduleText 
        })
        .eq('id', classId);

    if (updateError) {
        return { error: updateError.message };
    }

    revalidatePath('/class_scheduler/schedule');
    return { success: true };
}
