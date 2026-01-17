import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
    title: 'Student Dashboard | Class Registration System',
};

export default async function StudentDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // For students, we need to find their enrollments
    // This would typically be linked through family_members in a real scenario
    // For now, show a simplified view

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">
                    Welcome back, {user?.user_metadata?.first_name}!
                </h2>
                <p className="text-green-100">
                    View your class schedule and materials.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            My Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 text-sm mb-2">
                            View your upcoming classes
                        </p>
                        <Link href="/student/schedule">
                            <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                                View Schedule
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            My Classes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 text-sm mb-2">
                            View enrolled classes and materials
                        </p>
                        <Link href="/student/classes">
                            <Button variant="outline">View Classes</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Classes */}
            <Card className="border-0 shadow-lg">
                <CardHeader>
                    <CardTitle>Today&apos;s Classes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-slate-500">
                        <p>No classes scheduled for today.</p>
                        <Link href="/student/schedule">
                            <Button variant="link" className="mt-2">
                                View full schedule →
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
