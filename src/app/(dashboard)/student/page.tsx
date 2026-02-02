import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StudentStatsCards } from '@/components/student/StudentStatsCards';
import { NextClassCard } from '@/components/student/NextClassCard';

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  const { data: familyMember } = await supabase
    .from('family_members')
    .select('*')
    .eq('student_user_id', user.id)
    .single();

  if (!familyMember) {
      return (
          <div className="p-8 text-center">
              <h1 className="text-2xl font-bold">Account Not Linked</h1>
              <p className="text-muted-foreground mt-2">
                  Your account is not linked to a student profile. Please contact your administrator or parent.
              </p>
          </div>
      );
  }
  
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {familyMember.first_name}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {/* Stats Cards (Task 7.1.2) */}
         <StudentStatsCards studentId={familyMember.id} />

         {/* Next Class (Task 7.1.3) */}
         <NextClassCard studentId={familyMember.id} />
      </div>
    </div>
  );
}
