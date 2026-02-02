import Link from 'next/link';
import { Users, BookOpen, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    getParentDashboardStats,
    getUpcomingClassesForFamily,
    getRecentPayments,
    getPendingEnrollments,
} from '@/lib/actions/dashboard';

export const metadata = {
    title: 'Parent Dashboard | Class Registration System',
    description: 'Manage your family and class enrollments',
};

export default async function ParentDashboardPage() {
    // Fetch all dashboard data in parallel
    const [statsResult, upcomingResult, paymentsResult, pendingResult] =
        await Promise.all([
            getParentDashboardStats(),
            getUpcomingClassesForFamily(5),
            getRecentPayments(3),
            getPendingEnrollments(),
        ]);

    const stats = statsResult.data;
    const upcomingClasses = upcomingResult.data || [];
    const recentPayments = paymentsResult.data || [];
    const pendingEnrollments = pendingResult.data || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Parent Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Welcome back! Manage your family and enroll in classes.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Family Members
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.familyMemberCount ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            registered students
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Enrollments
                        </CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.activeEnrollmentCount ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            current classes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pending Payments
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats?.pendingPaymentTotal?.toFixed(2) ?? '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            outstanding balance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Upcoming Classes
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.upcomingClassCount ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            scheduled this week
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Upcoming Classes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upcoming Classes</CardTitle>
                        <CardDescription>
                            Your family&apos;s next scheduled classes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingClasses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No upcoming classes scheduled.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingClasses.map((cls) => (
                                    <div
                                        key={cls.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                {cls.className}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {cls.dayOfWeek} • {cls.startTime} - {cls.endTime}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {cls.familyMemberName}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            {cls.dayOfWeek}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            className="w-full mt-4"
                            asChild
                        >
                            <Link href="/parent/enrollments">
                                View All Enrollments
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Pending Enrollments */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Enrollments</CardTitle>
                        <CardDescription>
                            Enrollments waiting for payment
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pendingEnrollments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No pending enrollments.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {pendingEnrollments.map((enrollment) => (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">
                                                {enrollment.className}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {enrollment.familyMemberName}
                                            </p>
                                        </div>
                                        <Badge variant="secondary">
                                            ${enrollment.amountDue.toFixed(2)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            className="w-full mt-4"
                            asChild
                        >
                            <Link href="/parent/browse">
                                Browse Classes
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Payments */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>
                        Your latest payment history
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {recentPayments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No payment history yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentPayments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between py-2 border-b last:border-0"
                                >
                                    <div>
                                        <p className="font-medium text-sm">
                                            {payment.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            ${payment.amount.toFixed(2)}
                                        </span>
                                        <Badge
                                            variant={
                                                payment.status === 'completed'
                                                    ? 'default'
                                                    : payment.status === 'pending'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {payment.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks for managing your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild>
                            <Link href="/parent/family">
                                <Users className="mr-2 h-4 w-4" />
                                Manage Family
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/parent/browse">
                                <BookOpen className="mr-2 h-4 w-4" />
                                Browse Classes
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/parent/enrollments">
                                <Calendar className="mr-2 h-4 w-4" />
                                View Enrollments
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
