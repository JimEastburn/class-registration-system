import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import ClassStatusButton from '@/components/classes/ClassStatusButton';

export const metadata = {
    title: 'Class Details | Class Registration System',
};

const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function ClassDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

    if (!classData) {
        notFound();
    }

    // Fetch enrollments for this class
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      student:family_members(first_name, last_name, grade_level)
    `)
        .eq('class_id', id)
        .order('enrolled_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-semibold">{classData.name}</h2>
                        <Badge className={statusColors[classData.status as keyof typeof statusColors]}>
                            {classData.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{classData.description || 'No description'}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/teacher/classes/${id}/edit`}>
                        <Button variant="outline">Edit Class</Button>
                    </Link>
                    <ClassStatusButton classId={id} currentStatus={classData.status} />
                </div>
            </div>

            {/* Class Details */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Class Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Schedule</p>
                                <p className="font-medium">{classData.schedule}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Location</p>
                                <p className="font-medium">{classData.location}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Start Date</p>
                                <p className="font-medium">
                                    {new Date(classData.start_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">End Date</p>
                                <p className="font-medium">
                                    {new Date(classData.end_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Fee</p>
                                <p className="font-medium">${classData.fee.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Capacity</p>
                                <p className="font-medium">
                                    {classData.current_enrollment} / {classData.max_students}
                                </p>
                            </div>
                        </div>
                        {classData.syllabus && (
                            <div>
                                <p className="text-sm text-muted-foreground">Syllabus</p>
                                <a
                                    href={classData.syllabus}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    View Syllabus →
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Enrolled Students</CardTitle>
                        <Badge variant="secondary">
                            {enrollments?.length || 0} students
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {enrollments && enrollments.length > 0 ? (
                            <div className="space-y-3">
                                {enrollments.map((enrollment) => {
                                    const student = enrollment.student as unknown as {
                                        first_name: string;
                                        last_name: string;
                                        grade_level: string | null;
                                    };
                                    return (
                                        <div
                                            key={enrollment.id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted dark:bg-slate-800"
                                        >
                                            <div>
                                                <p className="font-medium">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                                {student.grade_level && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {student.grade_level}
                                                    </p>
                                                )}
                                            </div>
                                            <Badge
                                                variant={
                                                    enrollment.status === 'confirmed' ? 'default' : 'secondary'
                                                }
                                            >
                                                {enrollment.status}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No students enrolled yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
