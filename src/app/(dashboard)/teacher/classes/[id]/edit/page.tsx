import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClassForm from '@/components/classes/ClassForm';

export const metadata = {
    title: 'Edit Class | Class Registration System',
};

export default async function EditClassPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

    if (!classData) {
        notFound();
    }

    const role = user?.user_metadata?.role;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Edit Class</h2>
                <p className="text-slate-500">Update {classData.name}</p>
            </div>
            <ClassForm classData={classData} userRole={role} />
        </div>
    );
}
