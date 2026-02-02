import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSystemStats, getRecentActivity } from '@/lib/actions/admin';
import { SystemStatsCards } from '@/components/admin/SystemStatsCards';
import { RecentActivityFeed } from '@/components/admin/RecentActivityFeed';
import { PendingActionsCard } from '@/components/admin/PendingActionsCard';

import { ExportButton } from '@/components/admin/data-export/ExportButton';

export const metadata = {
  title: 'Admin Dashboard',
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      redirect('/dashboard'); // or 403
  }

  // Fetch data
  const { data: stats } = await getSystemStats();
  const { data: activity } = await getRecentActivity();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <ExportButton />
        </div>
      </div>
      
      {/* Stats */}
      {stats && <SystemStatsCards stats={stats} />}

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {activity && <RecentActivityFeed logs={activity} />}
         <PendingActionsCard />
      </div>
    </div>
  );
}
