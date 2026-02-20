import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WeeklyScheduleView } from '@/components/classes/WeeklyScheduleView';
import { resolveStudentFamilyMember } from '@/lib/logic/student-link';

export default async function StudentSchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  const familyMember = await resolveStudentFamilyMember(supabase, user);

  if (!familyMember) {
      return (
          <div className="p-8 text-center">
              <h1 className="text-2xl font-bold">Account Not Linked</h1>
              <p className="text-muted-foreground mt-2">
                  Your account is not linked to a student profile. Please contact your administrator.
              </p>
          </div>
      );
  }

  return (
    <div className="flex flex-col space-y-6 h-[calc(100dvh-100px)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Class Schedule</h1>
        <p className="text-muted-foreground">View your upcoming classes and events.</p>
      </div>
      <div className="flex-1 min-h-0">
        <WeeklyScheduleView studentId={familyMember.id} />
      </div>
    </div>
  );
}
