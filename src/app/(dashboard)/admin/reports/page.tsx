import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import UserRoleLegend from '@/components/admin/UserRoleLegend';
import EnrollmentStatusLegend from '@/components/admin/EnrollmentStatusLegend';
import PaymentStatusLegend from '@/components/admin/PaymentStatusLegend';

export const metadata = {
    title: 'Analytics & Reports | Admin Portal',
};

export default async function AdminReportsPage() {
    const supabase = await createClient();

    // Fetch all data for analytics
    const [
        { data: users },
        { data: classes },
        { data: enrollments },
        { data: payments },
    ] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at'),
        supabase.from('classes').select('id, status, fee, current_enrollment, max_students, created_at'),
        supabase.from('enrollments').select('id, status, enrolled_at'),
        supabase.from('payments').select('id, amount, status, created_at'),
    ]);

    // User stats by role
    const usersByRole = {
        parent: users?.filter(u => u.role === 'parent').length || 0,
        teacher: users?.filter(u => u.role === 'teacher').length || 0,
        student: users?.filter(u => u.role === 'student').length || 0,
        admin: users?.filter(u => u.role === 'admin').length || 0,
    };

    // Class stats
    const classStats = {
        total: classes?.length || 0,
        active: classes?.filter(c => c.status === 'active').length || 0,
        draft: classes?.filter(c => c.status === 'draft').length || 0,
        completed: classes?.filter(c => c.status === 'completed').length || 0,
        cancelled: classes?.filter(c => c.status === 'cancelled').length || 0,
    };

    // Calculate class capacity utilization
    const totalCapacity = classes?.reduce((sum, c) => sum + c.max_students, 0) || 0;
    const totalEnrolled = classes?.reduce((sum, c) => sum + c.current_enrollment, 0) || 0;
    const capacityUtilization = totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : 0;

    // Enrollment stats
    const enrollmentStats = {
        total: enrollments?.length || 0,
        pending: enrollments?.filter(e => e.status === 'pending').length || 0,
        confirmed: enrollments?.filter(e => e.status === 'confirmed').length || 0,
        cancelled: enrollments?.filter(e => e.status === 'cancelled').length || 0,
        completed: enrollments?.filter(e => e.status === 'completed').length || 0,
    };

    // Payment stats
    const paymentStats = {
        total: payments?.length || 0,
        completed: payments?.filter(p => p.status === 'completed').length || 0,
        pending: payments?.filter(p => p.status === 'pending').length || 0,
        failed: payments?.filter(p => p.status === 'failed').length || 0,
        refunded: payments?.filter(p => p.status === 'refunded').length || 0,
    };

    const totalRevenue = payments?.filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    const averagePayment = paymentStats.completed > 0
        ? totalRevenue / paymentStats.completed
        : 0;

    // Get enrollments by month (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const enrollmentsByMonth: { month: string; count: number }[] = [];

    for (let i = 0; i < 6; i++) {
        const monthStart = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
        const monthEnd = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i + 1, 0);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

        const count = enrollments?.filter(e => {
            const enrolledDate = new Date(e.enrolled_at);
            return enrolledDate >= monthStart && enrolledDate <= monthEnd;
        }).length || 0;

        enrollmentsByMonth.push({ month: monthName, count });
    }

    // Get revenue by month (last 6 months)
    const revenueByMonth: { month: string; amount: number }[] = [];

    for (let i = 0; i < 6; i++) {
        const monthStart = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
        const monthEnd = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i + 1, 0);
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });

        const amount = payments?.filter(p => {
            const paymentDate = new Date(p.created_at);
            return paymentDate >= monthStart && paymentDate <= monthEnd && p.status === 'completed';
        }).reduce((sum, p) => sum + p.amount, 0) || 0;

        revenueByMonth.push({ month: monthName, amount });
    }

    const maxEnrollment = Math.max(...enrollmentsByMonth.map(m => m.count), 1);
    const maxRevenue = Math.max(...revenueByMonth.map(m => m.amount), 1);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold">Analytics & Reports</h2>
                    <p className="text-slate-500">Overview of your system metrics</p>
                </div>
                <Link href="/admin/reports/export">
                    <Button variant="outline">Export Reports</Button>
                </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-[#4c7c92] to-[#3a6073] text-white">
                    <CardContent className="pt-6">
                        <p className="text-slate-100 text-sm">Total Users</p>
                        <p className="text-3xl font-bold">{users?.length || 0}</p>
                        <p className="text-slate-200 text-xs mt-1">
                            {usersByRole.parent} parents, {usersByRole.teacher} teachers
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-blue-100 text-sm">Active Classes</p>
                        <p className="text-3xl font-bold">{classStats.active}</p>
                        <p className="text-blue-200 text-xs mt-1">
                            {classStats.total} total classes
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-green-100 text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
                        <p className="text-green-200 text-xs mt-1">
                            ${averagePayment.toFixed(2)} avg per payment
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="pt-6">
                        <p className="text-orange-100 text-sm">Capacity Utilization</p>
                        <p className="text-3xl font-bold">{capacityUtilization}%</p>
                        <p className="text-orange-200 text-xs mt-1">
                            {totalEnrolled} / {totalCapacity} spots filled
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Enrollments Chart */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-base">Enrollments (Last 6 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between h-40 gap-2">
                            {enrollmentsByMonth.map((month) => (
                                <div key={month.month} className="flex flex-col items-center flex-1">
                                    <div
                                        className="w-full bg-gradient-to-t from-[#4c7c92] to-[#6b8ca5] rounded-t transition-all"
                                        style={{ height: `${(month.count / maxEnrollment) * 100}%`, minHeight: '4px' }}
                                    />
                                    <span className="text-xs text-slate-500 mt-2">{month.month}</span>
                                    <span className="text-xs font-semibold">{month.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Chart */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-base">Revenue (Last 6 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end justify-between h-40 gap-2">
                            {revenueByMonth.map((month) => (
                                <div key={month.month} className="flex flex-col items-center flex-1">
                                    <div
                                        className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
                                        style={{ height: `${(month.amount / maxRevenue) * 100}%`, minHeight: '4px' }}
                                    />
                                    <span className="text-xs text-slate-500 mt-2">{month.month}</span>
                                    <span className="text-xs font-semibold">${month.amount.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Users by Role */}
                <div className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-base">Users by Role</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Parents</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-[#4c7c92] h-2 rounded-full"
                                            style={{ width: `${((usersByRole.parent / (users?.length || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{usersByRole.parent}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Teachers</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${((usersByRole.teacher / (users?.length || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{usersByRole.teacher}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Students</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${((usersByRole.student / (users?.length || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{usersByRole.student}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Admins</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${((usersByRole.admin / (users?.length || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{usersByRole.admin}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <UserRoleLegend />
                </div>

                {/* Enrollment Status */}
                <div className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-base">Enrollment Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Pending</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ width: `${((enrollmentStats.pending / (enrollmentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{enrollmentStats.pending}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Confirmed</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${((enrollmentStats.confirmed / (enrollmentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{enrollmentStats.confirmed}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Completed</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${((enrollmentStats.completed / (enrollmentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{enrollmentStats.completed}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Cancelled</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${((enrollmentStats.cancelled / (enrollmentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{enrollmentStats.cancelled}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <EnrollmentStatusLegend />
                </div>

                {/* Payment Status */}
                <div className="space-y-4">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-base">Payment Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Completed</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${((paymentStats.completed / (paymentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{paymentStats.completed}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Pending</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ width: `${((paymentStats.pending / (paymentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{paymentStats.pending}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Refunded</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-[#4c7c92] h-2 rounded-full"
                                            style={{ width: `${((paymentStats.refunded / (paymentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{paymentStats.refunded}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Failed</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${((paymentStats.failed / (paymentStats.total || 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold w-8">{paymentStats.failed}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <PaymentStatusLegend />
                </div>
            </div>
        </div>
    );
}
