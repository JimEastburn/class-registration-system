import { createClient } from '@/lib/supabase/server';

export default async function DebugPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <pre>No user logged in</pre>;

    const { data: teacherClasses, error: classesError } = await supabase
        .from('classes')
        .select('id, name, teacher_id')
        .eq('teacher_id', user.id);

    const classIds = teacherClasses?.map(c => c.id) || [];

    const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
            id,
            status,
            class_id,
            student_id,
            student:family_members(first_name, last_name)
        `)
        .in('class_id', classIds);

    return (
        <div className="p-8 space-y-8 bg-white text-black font-mono text-sm overflow-auto">
            <h1 className="text-xl font-bold">Debug Info</h1>

            <section>
                <h2 className="font-bold border-b">User</h2>
                <pre>{JSON.stringify({ id: user.id, email: user.email, role: user.user_metadata?.role }, null, 2)}</pre>
            </section>

            <section>
                <h2 className="font-bold border-b">Classes Fetch</h2>
                {classesError && <pre className="text-red-600">{JSON.stringify(classesError, null, 2)}</pre>}
                <pre>{JSON.stringify(teacherClasses, null, 2)}</pre>
            </section>

            <section>
                <h2 className="font-bold border-b">Enrollments Fetch</h2>
                {enrollmentsError && <pre className="text-red-600">{JSON.stringify(enrollmentsError, null, 2)}</pre>}
                <pre>{JSON.stringify(enrollments, null, 2)}</pre>
            </section>
        </div>
    );
}
