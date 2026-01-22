import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout, {
    HomeIcon,
    CalendarIcon,
    BookOpenIcon,
} from '@/components/dashboard/DashboardLayout';

const navItems = [
    { href: '/student', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
    { href: '/student/schedule', label: 'My Schedule', icon: <CalendarIcon className="h-5 w-5" /> },
    { href: '/student/classes', label: 'My Classes', icon: <BookOpenIcon className="h-5 w-5" /> },
];

export default async function StudentLayout({
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

    if (!profile || profile.role !== 'student') {
        redirect(`/${profile?.role || user.user_metadata?.role || 'parent'}`);
    }

    const userData = {
        firstName: profile.first_name || user.user_metadata?.first_name || 'User',
        lastName: profile.last_name || user.user_metadata?.last_name || '',
        email: user.email || '',
        role: profile.role,
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Student Dashboard">
            {children}
        </DashboardLayout>
    );
}
