import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllEnrollments } from '@/lib/actions/enrollments';
import { EnrollmentManagementTable } from '@/components/admin/EnrollmentManagementTable';
import { EnrollmentStatus } from '@/types'; // Keep if used for casting, or remove if unused line 5 was the import

export const metadata = {
  title: 'Enrollment Management',
};

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; classId?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || 'all';
  const classId = params.classId || 'all';
  const limit = 20;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const allowedRoles = ['admin', 'super_admin', 'class_scheduler'];
  
  if (!profile || !allowedRoles.includes(profile.role)) {
      redirect('/dashboard');
  }

  const { data: enrollments, count, error } = await getAllEnrollments(page, limit, { 
      search, 
      status: status as EnrollmentStatus | 'all', 
      classId 
  });

  if (error) {
      return <div>Error loading enrollments: {error}</div>;
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Enrollment Management</h2>
      </div>
      
      <EnrollmentManagementTable 
        enrollments={enrollments || []} 
        totalCount={count}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
