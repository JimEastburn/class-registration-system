import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ClassDetailCard } from '@/components/student/ClassDetailCard';
import { ClassLocationCard } from '@/components/student/ClassLocationCard';
import { ClassMaterialsList } from '@/components/classes/ClassMaterialsList';
import { ClassScheduleCard } from '@/components/student/ClassScheduleCard';
import { resolveStudentFamilyMember } from '@/lib/logic/student-link';

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  const familyMember = await resolveStudentFamilyMember(supabase, user);

  if (!familyMember) {
      return (
          <div className="p-8 text-center">
            <h1 className="text-xl font-bold">Account Not Linked</h1>
          </div>
      );
  }

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('status')
    .eq('class_id', id)
    .eq('student_id', familyMember.id)
    .single();

  if (!enrollment || enrollment.status !== 'confirmed') {
      return (
          <div className="p-8 text-center space-y-4">
              <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
              <p>You are not enrolled in this class.</p>
              <Link href="/student/schedule">
                <Button variant="outline">Back to Schedule</Button>
              </Link>
          </div>
      );
  }

  // Fetch Class Details — separate teacher join to avoid RLS on profiles causing total failure
  const { data: classDetails, error: classError } = await supabase
    .from('classes')
    .select(`
        *,
        semester:semesters (name),
        program:programs (name),
        materials:class_materials(*)
    `)
    .eq('id', id)
    .single();

  if (classError) {
    console.error('Error fetching class details:', classError.message);
  }

  if (!classDetails) notFound();

  // Fetch teacher profile separately — may be blocked by RLS for students
  let teacher: { first_name: string | null; last_name: string | null; email: string | null } | null = null;
  if (classDetails.teacher_id) {
    const { data: teacherData } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', classDetails.teacher_id)
      .single();
    teacher = teacherData;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
           <Link href="/student/schedule">
                <Button variant="ghost" size="icon">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
           </Link>
           <div>
                <h1 className="text-3xl font-bold tracking-tight">{classDetails.name}</h1>
                <p className="text-muted-foreground">{classDetails.program?.name} • {classDetails.semester?.name}</p>
           </div>
       </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
           <div className="space-y-6 lg:col-span-2">
                <ClassDetailCard 
                    description={classDetails.description} 
                    teacher={teacher}
                />
                
                <ClassMaterialsList materials={classDetails.materials} />
           </div>

           <div className="space-y-6">
                <ClassScheduleCard 
                    dayOfWeek={classDetails.day_of_week}
                    startTime={classDetails.start_time}
                    endTime={classDetails.end_time}
                    startDate={classDetails.start_date}
                    endDate={classDetails.end_date}
                />

                <ClassLocationCard location={classDetails.location} />
           </div>
       </div>
    </div>
  );
}
