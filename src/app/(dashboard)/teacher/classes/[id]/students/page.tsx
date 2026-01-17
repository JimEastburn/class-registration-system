import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
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

export const metadata = {
    title: 'Class Students | Class Registration System',
};

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function ClassStudentsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

    if (!classData) {
        notFound();
    }

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      student:family_members(first_name, last_name, grade_level, parent_id)
    `)
        .eq('class_id', id)
        .order('enrolled_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Students in {classData.name}</h2>
                <p className="text-slate-500">
                    {enrollments?.length || 0} students enrolled
                </p>
            </div>

            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Enrollment List</CardTitle>
                </CardHeader>
                <CardContent>
                    {enrollments && enrollments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student Name</TableHead>
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
                                        parent_id: string;
                                    };
                                    return (
                                        <TableRow key={enrollment.id}>
                                            <TableCell className="font-medium">
                                                {student.first_name} {student.last_name}
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
                            No students enrolled in this class yet.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
