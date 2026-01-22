import { createClient } from '@/lib/supabase/server';
import StudentScheduleView from '@/components/dashboard/StudentScheduleView';

export const metadata = {
    title: 'My Schedule | Class Registration System',
};

export default async function StudentSchedulePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
            id,
            status,
            class:classes(
                id,
                name,
                schedule,
                location,
                start_date,
                end_date,
                teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
            )
        `)
        .eq('status', 'confirmed');

    const typedEnrollments = (enrollments || []) as any[];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">My Schedule</h2>
                <p className="text-slate-500">View your weekly class schedule</p>
            </div>

            <StudentScheduleView enrollments={typedEnrollments} />
        </div>
    );
}
