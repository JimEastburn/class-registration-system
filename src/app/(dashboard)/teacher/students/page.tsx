import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import EnrollmentStatusLegend from '@/components/admin/EnrollmentStatusLegend';

export const metadata = {
    title: 'All Students | Class Registration System',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
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
      student:family_members(first_name, last_name, grade_level)
    `)
        .in('class_id', classIds)
        .order('enrolled_at', { ascending: false });

    // Map class names for easier display
    const classNameMap = Object.fromEntries(
        teacherClasses?.map(c => [c.id, c.name]) || []
    );

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
                    {enrollments && enrollments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Enrolled On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrollments.map((enrollment) => {
                                    const student = enrollment.student as unknown as {
                                        first_name: string;
                                        last_name: string;
                                        grade_level: string | null;
                                    };
                                    return (
                                        <TableRow key={enrollment.id}>
                                            <TableCell className="font-medium">
                                                {student.first_name} {student.last_name}
                                            </TableCell>
                                            <TableCell>
                                                {classNameMap[enrollment.class_id]}
                                            </TableCell>
                                            <TableCell>
                                                {student.grade_level
                                                    ? `Grade ${student.grade_level}`
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        statusColors[
                                                        enrollment.status as keyof typeof statusColors
                                                        ]
                                                    }
                                                >
                                                    {enrollment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center text-slate-500 py-8">
                            No students enrolled in any of your classes yet.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
