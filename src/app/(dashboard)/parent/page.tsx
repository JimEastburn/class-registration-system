import Link from 'next/link';
import {
  Users,
  BookOpen,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getParentDashboardStats,
  getRecentPayments,
  getPendingEnrollments,
} from '@/lib/actions/dashboard';
import { formatCurrency } from '@/lib/utils';

export const metadata = {
  title: 'Parent Dashboard | Class Registration System',
  description: 'Manage your family and class enrollments',
};

export default async function ParentDashboardPage() {
  // Fetch all dashboard data in parallel
  const [statsResult, paymentsResult, pendingResult] =
    await Promise.all([
      getParentDashboardStats(),
      getRecentPayments(3),
      getPendingEnrollments(),
    ]);

  const stats = statsResult.data;
  const recentPayments = paymentsResult.data || [];
  const pendingEnrollments = pendingResult.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Manage your family and enroll in classes.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/parent/family" className="block h-full">
          <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Family Members
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.familyMemberCount ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/parent/enrollments" className="block h-full">
          <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Enrollments
              </CardTitle>
              <BookOpen className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeEnrollmentCount ?? 0}
              </div>
              <p className="text-muted-foreground text-xs">current classes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/parent/enrollments" className="block h-full">
          <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payments
              </CardTitle>
              <CreditCard className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.pendingPaymentTotal ?? 0)}
              </div>
              <p className="text-muted-foreground text-xs">outstanding balance</p>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Pending Enrollments & Recent Payments */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Pending Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Enrollments</CardTitle>
            <CardDescription>Enrollments waiting for payment</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingEnrollments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No pending enrollments.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {enrollment.className}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {enrollment.familyMemberName}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatCurrency(enrollment.amountDue)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 w-full" asChild>
              <Link href="/parent/browse">
                Browse Classes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your latest payment history</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No payment history yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{payment.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCurrency(payment.amount)}
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
      </div>

      {/* Quick Actions */}
      <Card className="w-fit">
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
                <BookOpen className="mr-2 h-4 w-4" />
                View Enrollments
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
