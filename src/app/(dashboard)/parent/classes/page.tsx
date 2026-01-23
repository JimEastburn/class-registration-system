import { createClient } from '@/lib/supabase/server';
import ClassSearchList from '@/components/classes/ClassSearchList';
import { ClassWithTeacher } from '@/types';

export const metadata = {
    title: 'Browse Classes | Class Registration System',
};

export default async function BrowseClassesPage() {
    const supabase = await createClient();

    // Fetch all active classes with teacher info
    const { data: classes } = await supabase
        .from('classes')
        .select(`
      *,
      teacher:profiles!classes_teacher_id_fkey(first_name, last_name)
    `)
        .eq('status', 'active')
        .order('start_date', { ascending: true });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Browse Classes</h2>
                <p className="text-slate-500">Find and enroll your children in available classes</p>
            </div>

            <ClassSearchList initialClasses={(classes || []) as unknown as ClassWithTeacher[]} />
        </div>
    );
}
