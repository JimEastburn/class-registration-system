import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
                    <h1 className="text-3xl font-bold tracking-tight">
                        Enrollments
                    </h1>
                    <p className="text-muted-foreground">
                        View and manage your family&apos;s class enrollments
                    </p>
                </div>
            </div>

            {/* Status Legend */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Enrollment Status Guide</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-yellow-500" />
                        <div>
                            <p className="font-medium text-sm">Pending Payment</p>
                            <p className="text-xs text-muted-foreground">
                                You have secured a spot but need to complete check out.
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                        <div>
                            <p className="font-medium text-sm">Confirmed</p>
                            <p className="text-xs text-muted-foreground">
                                Detailed success! You are fully enrolled in this class.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-orange-500" />
                        <div>
                            <p className="font-medium text-sm">Waitlisted</p>
                            <p className="text-xs text-muted-foreground">
                                The class is full. You are on the waiting list for a spot.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-3 w-3 rounded-full bg-destructive/50" />
                        <div>
                            <p className="font-medium text-sm">Cancelled</p>
                            <p className="text-xs text-muted-foreground">
                                This enrollment has been cancelled and is no longer active.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
            <div className="text-center py-8 text-destructive">
                Failed to load enrollments: {error}
            </div>
        );
    }

    if (!enrollments || enrollments.length === 0) {
        return (
            <div className="text-center py-8">
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
