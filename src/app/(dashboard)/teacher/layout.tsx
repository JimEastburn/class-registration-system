import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout, {
    HomeIcon,
    BookOpenIcon,
    UsersIcon,
    PlusIcon,
} from '@/components/dashboard/DashboardLayout';

const navItems = [
    { href: '/teacher', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
    { href: '/teacher/classes', label: 'My Classes', icon: <BookOpenIcon className="h-5 w-5" /> },
    { href: '/teacher/classes/new', label: 'Create Class', icon: <PlusIcon className="h-5 w-5" /> },
    { href: '/teacher/students', label: 'Students', icon: <UsersIcon className="h-5 w-5" /> },
];

export default async function TeacherLayout({
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
    if (role !== 'teacher') {
        redirect(`/${role}`);
    }

    const userData = {
        firstName: user.user_metadata?.first_name || 'User',
        lastName: user.user_metadata?.last_name || '',
        email: user.email || '',
        role: 'teacher',
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Teacher Dashboard">
            {children}
        </DashboardLayout>
    );
}
