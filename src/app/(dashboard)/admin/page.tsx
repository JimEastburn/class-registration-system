import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
    title: 'Admin Dashboard | Class Registration System',
};

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Fetch counts for dashboard
    const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

    const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

    const { count: paymentCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

    // Get recent activity
    const { data: recentEnrollments } = await supabase
        .from('enrollments')
        .select(`
      id,
      status,
      enrolled_at,
      student:family_members(first_name, last_name),
      class:classes(name)
    `)
        .order('enrolled_at', { ascending: false })
        .limit(5);

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
                <p className="text-red-100">
                    Full system access. Manage users, classes, enrollments, and payments.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-0 shadow-lg" data-testid="stat-card-users">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold" data-testid="stat-value-users">{userCount || 0}</div>
                        <Link href="/admin/users">
                            <Button variant="link" className="p-0 h-auto text-red-600">
                                Manage users →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg" data-testid="stat-card-classes">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Classes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold" data-testid="stat-value-classes">{classCount || 0}</div>
                        <Link href="/admin/classes">
                            <Button variant="link" className="p-0 h-auto text-red-600">
                                Manage classes →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg" data-testid="stat-card-enrollments">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Enrollments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold" data-testid="stat-value-enrollments">{enrollmentCount || 0}</div>
                        <Link href="/admin/enrollments">
                            <Button variant="link" className="p-0 h-auto text-red-600">
                                View enrollments →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg" data-testid="stat-card-payments">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Completed Payments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold" data-testid="stat-value-payments">{paymentCount || 0}</div>
                        <Link href="/admin/payments">
                            <Button variant="link" className="p-0 h-auto text-red-600">
                                View payments →
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg" data-testid="recent-enrollments-card">
                <CardHeader>
                    <CardTitle>Recent Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                    {recentEnrollments && recentEnrollments.length > 0 ? (
                        <div className="space-y-3" data-testid="recent-enrollments-list">
                            {recentEnrollments.map((enrollment) => {
                                const student = enrollment.student as unknown as { first_name: string; last_name: string };
                                const classData = enrollment.class as unknown as { name: string };
                                return (
                                    <div
                                        key={enrollment.id}
                                        data-testid="recent-enrollment-item"
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                                    >
                                        <div>
                                            <p className="font-medium" data-testid="student-name">
                                                {student.first_name} {student.last_name}
                                            </p>
                                            <p className="text-sm text-slate-500">{classData.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-sm px-2 py-1 rounded ${enrollment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                enrollment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {enrollment.status}
                                            </span>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-4" data-testid="no-activity-message">No recent activity</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
