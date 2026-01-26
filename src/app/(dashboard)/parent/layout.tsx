import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardLayout, {
    HomeIcon,
    UsersIcon,
    BookOpenIcon,
    CreditCardIcon,
} from '@/components/dashboard/DashboardLayout';

const navItems = [
    { href: '/parent', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
    { href: '/parent/family', label: 'Family Members', icon: <UsersIcon className="h-5 w-5" /> },
    { href: '/parent/classes', label: 'Browse Classes', icon: <BookOpenIcon className="h-5 w-5" /> },
    { href: '/parent/enrollments', label: 'Enrollments', icon: <BookOpenIcon className="h-5 w-5" /> },
    { href: '/parent/payments', label: 'Payments', icon: <CreditCardIcon className="h-5 w-5" /> },
];

export default async function ParentLayout({
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

    if (!profile || (profile.role !== 'parent' && profile.role !== 'admin' && profile.role !== 'teacher' && profile.role !== 'class_scheduler')) {
        redirect(`/${profile?.role || user.user_metadata?.role || 'parent'}`);
    }

    const userData = {
        firstName: profile.first_name || user.user_metadata?.first_name || 'User',
        lastName: profile.last_name || user.user_metadata?.last_name || '',
        email: user.email || '',
        role: profile.role,
    };

    return (
        <DashboardLayout user={userData} navItems={navItems} title="Parent Dashboard">
            {children}
        </DashboardLayout>
    );
}
