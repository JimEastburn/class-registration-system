import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClassForm from '@/components/classes/ClassForm';
import { Modal } from '@/components/ui/modal';

interface EditClassPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function InterceptedEditClassPage({ params }: EditClassPageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: classData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !classData) {
        notFound();
    }

    // Fetch teachers for the dropdown
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'teacher')
        .order('last_name');

    const formattedTeachers = teachers?.map(t => ({
        id: t.id,
        full_name: `${t.first_name} ${t.last_name}`,
    })) || [];

    const userRole = user.user_metadata?.role;

    // Transform database class data to form props
    const formattedClassData = {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        location: classData.location,
        start_date: classData.start_date,
        end_date: classData.end_date,
        schedule: classData.schedule,
        max_students: classData.max_students,
        fee: classData.fee,
        syllabus: classData.syllabus,
        recurrence_pattern: classData.recurrence_pattern || undefined,
        recurrence_days: classData.recurrence_days ? 
            (Array.isArray(classData.recurrence_days) ? classData.recurrence_days : JSON.parse(classData.recurrence_days as unknown as string)) 
            : undefined,
        recurrence_time: classData.recurrence_time || undefined,
        recurrence_duration: classData.recurrence_duration || undefined,
        teacher_id: classData.teacher_id,
    };

    return (
        <Modal>
            <ClassForm 
                classData={formattedClassData} 
                userRole={userRole}
                teachers={formattedTeachers}
                redirectUrl="/class_scheduler/schedule"
            />
        </Modal>
    );
}
