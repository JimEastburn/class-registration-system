import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, BookOpen, Clock } from 'lucide-react';

export const metadata = {
    title: 'Class Scheduler Dashboard | Class Registration System',
};

export default async function ClassSchedulerDashboardPage() {
    const supabase = await createClient();

    // Fetch counts for dashboard
    const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

    const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

    const { count: waitlistCount } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">Class Scheduler Portal</h2>
                <p className="text-indigo-100">
                    Manage classes, schedules, and enrollments.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Classes
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{classCount || 0}</div>
                        <Link href="/class_scheduler/classes">
                            <Button variant="link" className="p-0 h-auto text-purple-600">
                                Manage classes →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Enrollments
                        </CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{enrollmentCount || 0}</div>
                        {/* Enrollments page could be added later or linked to class details */}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Waitlist Entries
                        </CardTitle>
                        <Clock className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{waitlistCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Link href="/class_scheduler/classes/new">
                            <Button className="w-full justify-start text-left" variant="outline">
                                <span className="mr-2">+</span> Create New Class
                            </Button>
                        </Link>
                        <Link href="/class_scheduler/classes">
                            <Button className="w-full justify-start text-left" variant="outline">
                                <BookOpen className="mr-2 h-4 w-4" /> View All Classes
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
