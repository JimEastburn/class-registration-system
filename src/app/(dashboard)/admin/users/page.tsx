import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllUsers } from '@/lib/actions/admin';
import { UserManagementTable } from '@/components/admin/UserManagementTable';

export const metadata = {
  title: 'User Management',
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const limit = 20;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      redirect('/dashboard');
  }

  const { data: users, count, error } = await getAllUsers(page, limit, search);

  if (error) {
      return <div>Error loading users: {error}</div>;
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
      </div>
      
      <UserManagementTable 
        users={users || []} 
        totalCount={count}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
