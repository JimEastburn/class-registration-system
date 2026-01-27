import { createClient } from '@/lib/supabase/server';
import { ScheduleClassData } from '@/lib/schedule-helpers';
import InteractiveSchedule from '@/components/classes/InteractiveSchedule';

export const metadata = {
    title: 'Class Schedule | Class Scheduler Portal',
    description: 'View the weekly class schedule.',
};

export default async function ClassSchedulePage() {
    const supabase = await createClient();
    
    // Fetch active classes with schedule info
    const { data: classesData } = await supabase
        .from('classes')
        .select(`
            id, 
            name, 
            recurrence_pattern, 
            recurrence_days, 
            recurrence_time, 
            recurrence_duration, 
            schedule,
            teacher_id,
            teacher:profiles!classes_teacher_id_fkey(last_name)
        `)
        .neq('status', 'cancelled');
    
    const classes = (classesData || []) as unknown as ScheduleClassData[];

    return (
        <div className="space-y-6">
            <InteractiveSchedule classes={classes} />
        </div>
    );
}
