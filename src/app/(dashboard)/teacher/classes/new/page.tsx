import { createClient } from '@/lib/supabase/server';
import ClassForm from '@/components/classes/ClassForm';

export const metadata = {
    title: 'Create New Class | Class Registration System',
};

export default async function NewClassPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Create New Class</h2>
                <p className="text-muted-foreground">Set up a new class for students to enroll in</p>
            </div>
            <ClassForm userRole={role} />
        </div>
    );
}
