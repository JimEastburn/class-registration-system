import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/profile/ProfileForm';

export const metadata = {
    title: 'My Profile | Class Registration System',
};

export default async function StudentProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">My Profile</h2>
                <p className="text-slate-500">Manage your account information</p>
            </div>

            <ProfileForm
                initialData={{
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    phone: profile.phone || '',
                    bio: profile.bio || '',
                    email: profile.email,
                    role: profile.role,
                }}
            />
        </div>
    );
}
