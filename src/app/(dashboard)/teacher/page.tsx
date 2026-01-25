import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export const metadata = {
    title: 'Teacher Dashboard | Class Registration System',
};

export default async function TeacherDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch teacher's classes
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

    const activeClasses = classes?.filter(c => c.status === 'active').length || 0;
    const totalStudents = classes?.reduce((sum, c) => sum + (c.current_enrollment || 0), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">
                    Hi {user?.user_metadata?.first_name}!
                </h2>
                <p className="text-primary-foreground/90">
                    Manage your classes and track student enrollments.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Active Classes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{activeClasses}</div>
                        <Link href="/teacher/classes">
                            <Button variant="link" className="p-0 h-auto text-primary">
                                View all classes →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalStudents}</div>
                        <Link href="/teacher/students">
                            <Button variant="link" className="p-0 h-auto text-primary">
                                View students →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Create New Class
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm mb-2">
                            Start a new class for students
                        </p>
                        <Link href="/teacher/classes/new">
                            <Button className="bg-gradient-to-r from-primary to-secondary">
                                + New Class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Classes */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Your Classes</CardTitle>
                </CardHeader>
                <CardContent>
                    {classes && classes.length > 0 ? (
                        <div className="space-y-4">
                            {classes.slice(0, 5).map((classItem) => (
                                <div
                                    key={classItem.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-muted dark:bg-slate-800"
                                >
                                    <div>
                                        <h4 className="font-medium">{classItem.name}</h4>
                                        <p className="text-sm text-slate-500">
                                            {classItem.schedule} • {classItem.location}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={classItem.status === 'active' ? 'default' : 'secondary'}
                                        >
                                            {classItem.status}
                                        </Badge>
                                        <span className="text-sm text-slate-500">
                                            {classItem.current_enrollment}/{classItem.max_students} students
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>You haven&apos;t created any classes yet.</p>
                            <Link href="/teacher/classes/new">
                                <Button className="mt-4">Create Your First Class</Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
