import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getEnrollmentsForFamily } from '@/lib/actions/enrollments';
import { EnrollmentListClient } from '@/components/classes/EnrollmentListClient';

export const metadata = {
  title: 'Enrollments | Class Registration System',
  description: 'View and manage your family enrollments',
};

export default function EnrollmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enrollments</h1>
          <p className="text-muted-foreground">
            View and manage your family&apos;s class enrollments
          </p>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-3">
          <p className="font-medium">Enrollment Status Guide</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-2">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--status-pending-dot)]" />
              <div>
                <p className="font-medium">Pending Payment</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  You have secured a spot but need to complete check out and pay before attending the class.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--status-confirmed-dot)]" />
              <div>
                <p className="font-medium">Confirmed</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  You are fully enrolled in this class.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--status-waitlisted-dot)]" />
              <div>
                <p className="font-medium">Waitlisted</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  The class is full. You are on the waiting list for a spot.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--status-cancelled-dot)]" />
              <div>
                <p className="font-medium">Cancelled</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  This enrollment has been cancelled and is no longer active.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Enrollments</CardTitle>
          <CardDescription>
            A list of all enrollments for your family members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<EnrollmentsSkeleton />}>
            <EnrollmentsWrapper />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function EnrollmentsWrapper() {
  const { data: enrollments, error } = await getEnrollmentsForFamily();

  if (error) {
    return (
      <div className="text-destructive py-8 text-center">
        Failed to load enrollments: {error}
      </div>
    );
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground mb-4">
          No enrollments yet. Browse available classes to get started.
        </p>
        <Button asChild>
          <Link href="/parent/browse">Browse Classes</Link>
        </Button>
      </div>
    );
  }

  return <EnrollmentListClient enrollments={enrollments} />;
}

function EnrollmentsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
