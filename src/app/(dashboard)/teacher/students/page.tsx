import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EnrollmentStatusLegend from '@/components/admin/EnrollmentStatusLegend';
import StudentList from '@/components/teacher/StudentList';

export const metadata = {
    title: 'All Students | Class Registration System',
};

export default async function TeacherAllStudentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch all classes for this teacher
    const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user?.id);

    const classIds = teacherClasses?.map(c => c.id) || [];

    // 2. Fetch all enrollments for these classes
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      class_id,
      student_id,
      student:family_members(
        id,
        first_name,
        last_name,
        grade_level,
        parent:profiles!public_family_members_parent_id_fkey(
          email,
          phone,
          family_members(
            id,
            first_name,
            last_name,
            role
          )
        )
      )
    `)
        .in('class_id', classIds)
        .order('enrolled_at', { ascending: false });

    // 3. Fetch blocks for these classes
    // We fetch all blocks for this teacher's classes to map them
    const { data: blocks } = await supabase
        .from('class_blocks')
        .select('class_id, student_id')
        .in('class_id', classIds);

    const blockedSet = new Set(
        blocks?.map(b => `${b.class_id}:${b.student_id}`) || []
    );

    // Map class names for easier display
    const classNameMap = Object.fromEntries(
        teacherClasses?.map(c => [c.id, c.name]) || []
    );

    // Type casting because the deep nested query result is hard to match automatically with the strict component types
    const typedEnrollments = (enrollments as any) || [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">All Enrolled Students</h2>
                <p className="text-slate-500">
                    Showing students across all your {teacherClasses?.length || 0} classes
                </p>
            </div>

            <EnrollmentStatusLegend />

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Combined Enrollment List</CardTitle>
                </CardHeader>
                <CardContent>
                    <StudentList
                        enrollments={typedEnrollments}
                        blockedSet={blockedSet}
                        classNameMap={classNameMap}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
