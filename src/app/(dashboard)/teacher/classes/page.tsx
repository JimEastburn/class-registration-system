import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import ClassStatusButton from '@/components/classes/ClassStatusButton';
import DeleteClassButton from '@/components/classes/DeleteClassButton';

export const metadata = {
    title: 'My Classes | Class Registration System',
};

const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
};

export default async function TeacherClassesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">My Classes</h2>
                    <p className="text-slate-500">Manage your classes and view enrollments</p>
                </div>
                <Link href="/teacher/classes/new">
                    <Button className="bg-gradient-to-r from-primary to-secondary">
                        + Create New Class
                    </Button>
                </Link>
            </div>

            {classes && classes.length > 0 ? (
                <div className="grid gap-4">
                    {classes.map((classItem) => (
                        <Card key={classItem.id} className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                                    <Badge className={statusColors[classItem.status as keyof typeof statusColors]}>
                                        {classItem.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Schedule</p>
                                        <p className="font-medium">{classItem.schedule}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Location</p>
                                        <p className="font-medium">{classItem.location}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Enrollment</p>
                                        <p className="font-medium">
                                            {classItem.current_enrollment} / {classItem.max_students} students
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Fee</p>
                                        <p className="font-medium">${classItem.fee.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Link href={`/teacher/classes/${classItem.id}`}>
                                        <Button variant="outline" size="sm" data-testid={`view-details-${classItem.id}`}>
                                            View Details
                                        </Button>
                                    </Link>
                                    <Link href={`/teacher/classes/${classItem.id}/edit`}>
                                        <Button variant="outline" size="sm" data-testid={`edit-class-${classItem.id}`}>
                                            Edit
                                        </Button>
                                    </Link>
                                    <Link href={`/teacher/classes/${classItem.id}/students`}>
                                        <Button variant="outline" size="sm" data-testid={`view-students-${classItem.id}`}>
                                            View Students
                                        </Button>
                                    </Link>

                                    <ClassStatusButton
                                        classId={classItem.id}
                                        currentStatus={classItem.status}
                                    />
                                    {classItem.status === 'draft' && (
                                        <DeleteClassButton id={classItem.id} name={classItem.name} />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="text-center py-12">
                        <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
                        <p className="text-slate-500 mb-4">
                            Create your first class to start accepting students.
                        </p>
                        <Link href="/teacher/classes/new">
                            <Button className="bg-gradient-to-r from-primary to-secondary">
                                Create Your First Class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
