import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import type { UserRole } from '@/types';
import { getActiveView } from '@/lib/actions/profile';
import { getAllowedViews } from '@/lib/logic/profile';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user profile with role
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, avatar_url')
        .eq('id', user.id)
        .single();

    if (!profile) {
        // Profile doesn't exist, redirect to login
        redirect('/login');
    }

    const userRole = profile.role as UserRole;

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar - hidden on mobile */}
            <Sidebar userRole={userRole} className="hidden lg:flex" />

            {/* Main content area with left margin for sidebar on desktop */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Top navigation bar */}
                <Topbar
                    user={{
                        id: profile.id,
                        email: profile.email,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        role: userRole,
                        avatarUrl: profile.avatar_url,
                    }}
                    activeView={await getActiveView()}
                    allowedViews={getAllowedViews(userRole)}
                />

                {/* Mobile navigation - visible only on mobile */}
                <MobileNav userRole={userRole} />

                {/* Main content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
