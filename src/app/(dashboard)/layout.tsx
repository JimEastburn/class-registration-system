import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { MobileNav } from '@/components/dashboard/MobileNav';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, last_name, role, avatar_url, is_parent, is_volunteer_admin, is_photo_consent_admin'
    )
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Profile doesn't exist, redirect to login
    redirect('/login');
  }

  const userRole = profile.role as UserRole;

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar
        userRole={userRole}
        isParent={profile.is_parent === true}
        isVolunteerAdmin={profile.is_volunteer_admin === true}
        isPhotoConsentAdmin={profile.is_photo_consent_admin === true}
        className="hidden lg:flex"
      />

      {/* Main content area with left margin for sidebar on desktop */}
      <div className="flex min-h-screen flex-col lg:ml-64">
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
        />

        {/* Mobile navigation - visible only on mobile */}
        <MobileNav
          userRole={userRole}
          isParent={profile.is_parent === true}
          isVolunteerAdmin={profile.is_volunteer_admin === true}
          isPhotoConsentAdmin={profile.is_photo_consent_admin === true}
        />

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
