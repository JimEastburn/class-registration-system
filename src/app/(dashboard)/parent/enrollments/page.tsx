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
