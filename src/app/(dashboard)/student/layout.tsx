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

    // Check role
    const role = user.user_metadata?.role;
    if (role !== 'student') {
        redirect(`/${role}`);
    }

    const userData = {
        firstName: user.user_metadata?.first_name || 'User',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        role: 'student',
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Student Dashboard">
            {children}
        </DashboardLayout>
    );
}
