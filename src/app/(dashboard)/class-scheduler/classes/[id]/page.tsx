
import { SchedulerClassForm } from '@/components/class-scheduler/SchedulerClassForm';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: PageProps) {
    const { id } = await params;
    
    // We can fetch directly or reuse action if it supported fetching one.
    // getClassesForScheduler returns list.
    // I'll assume I can fetch one via Supabase directly here for simplicity or add getClass to API.
    // Using direct fetch for server component is fine.
    const supabase = await createClient();
    const { data: cls } = await supabase.from('classes').select('*').eq('id', id).single();

    if (!cls) {
        notFound();
    }

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Edit Class</h1>
            <SchedulerClassForm initialData={cls} isEdit={true} />
        </div>
    );
}
