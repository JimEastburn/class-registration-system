import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import FamilyMemberForm from '@/components/family/FamilyMemberForm';

export const metadata = {
    title: 'Edit Family Member | Class Registration System',
};

export default async function EditFamilyMemberPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: member } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', id)
        .eq('parent_id', user?.id)
        .single();

    if (!member) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Edit Family Member</h2>
                <p className="text-slate-500">Update {member.first_name}&apos;s information</p>
            </div>
            <FamilyMemberForm member={member} />
        </div>
    );
}
