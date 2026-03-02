import Link from 'next/link';
import {
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/parent/family" className="block h-full">
          <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Family Members
              </CardTitle>
              <Users className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              {stats?.familyMemberNames && stats.familyMemberNames.length > 0 ? (
                <ul className="space-y-1">
                  {stats.familyMemberNames.map((name) => (
                    <li key={name} className="text-sm">{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No family members yet.</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
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

      {/* Pending Payments & Recent Payments */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Pending Payments */}
        <Link href="/parent/enrollments" className="block">
        <Card className="hover:border-primary/50 cursor-pointer transition-colors hover:shadow-sm">
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
            <CardDescription>Payment options coming soon!  We&apos;ll let you know when payments can be made using this website.</CardDescription>
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

          </CardContent>
        </Card>
        </Link>

        {/* Class Payments */}
        <Link href="/parent/enrollments" className="block h-full">
          <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
            <CardHeader>
              <CardTitle>Class Payments</CardTitle>
              <CardDescription>Payment options coming soon!  We&apos;ll let you know when payments can be made using this website.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeEnrollmentCount ?? 0}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>


    </div>
  );
}
