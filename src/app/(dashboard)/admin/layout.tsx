import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout, {
    HomeIcon,
    UsersIcon,
    BookOpenIcon,
    CreditCardIcon,
    ClipboardListIcon,
    ChartBarIcon,
} from '@/components/dashboard/DashboardLayout';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
    { href: '/admin/users', label: 'Users', icon: <UsersIcon className="h-5 w-5" /> },
    { href: '/admin/classes', label: 'Classes', icon: <BookOpenIcon className="h-5 w-5" /> },
    { href: '/admin/enrollments', label: 'Enrollments', icon: <ClipboardListIcon className="h-5 w-5" /> },
    { href: '/admin/payments', label: 'Payments', icon: <CreditCardIcon className="h-5 w-5" /> },
    { href: '/admin/reports', label: 'Reports', icon: <ChartBarIcon className="h-5 w-5" /> },
];

export default async function AdminLayout({
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

    if (!profile || profile.role !== 'admin') {
        redirect(`/${profile?.role || user.user_metadata?.role || 'parent'}`);
    }

    const userData = {
        firstName: profile.first_name || user.user_metadata?.first_name || 'Admin',
        lastName: profile.last_name || user.user_metadata?.last_name || '',
        email: user.email || '',
        role: profile.role,
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Admin Portal">
            {children}
        </DashboardLayout>
    );
}
