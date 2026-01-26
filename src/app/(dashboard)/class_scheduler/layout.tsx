
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout, {
    HomeIcon,
    BookOpenIcon,
} from '@/components/dashboard/DashboardLayout';

const navItems = [
    { href: '/class_scheduler', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
    { href: '/class_scheduler/classes', label: 'Classes', icon: <BookOpenIcon className="h-5 w-5" /> },
];

export default async function ClassSchedulerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check role from profiles table (Source of Truth)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, last_name')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'class_scheduler') {
        // If they have a role but accessed the wrong dashboard, redirect to their role's dashboard
        // If they are an admin, they might be accessing this via role switching, which DashboardLayout handles roughly
        // But for strict layout protection:
        redirect(`/${profile?.role || user.user_metadata?.role || 'parent'}`);
    }

    const userData = {
        firstName: profile.first_name || user.user_metadata?.first_name || 'Scheduler',
        lastName: profile.last_name || user.user_metadata?.last_name || '',
        email: user.email || '',
        role: profile.role,
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Scheduler Portal">
            {children}
        </DashboardLayout>
    );
}
