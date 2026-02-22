import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPublishedClasses } from '@/lib/actions/classes';
import { ClassGrid } from '@/components/classes/ClassGrid';

export const metadata = {
    title: 'Browse Classes | Class Registration System',
    description: 'Find and enroll in available classes',
};

interface BrowsePageProps {
    searchParams: Promise<{ search?: string; day?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
    const params = await searchParams;
    
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
                        Browse Classes
                    </h1>
                    <p className="text-muted-foreground">
                        Find and enroll your family members in available classes
                    </p>
                </div>
            </div>

            <div className="flex w-fit items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                <Info className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                    The $30 fee is the community fee for the class. Payment will still need to be made to the teacher of the class for the teacher&apos;s fee.
                </p>
            </div>

            <Suspense fallback={<ClassGridSkeleton />}>
                <ClassListWrapper 
                    search={params.search} 
                    day={params.day ? parseInt(params.day) : undefined} 
                />
            </Suspense>
        </div>
    );
}

async function ClassListWrapper({
    search,
    day,
}: {
    search?: string;
    day?: number;
}) {
    const { data: classes, error } = await getPublishedClasses({
        search,
        dayOfWeek: day,
    });

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>
                        Failed to load classes: {error}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!classes || classes.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Classes Available</CardTitle>
                    <CardDescription>
                        There are no published classes at this time. Please check
                        back later.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return <ClassGrid classes={classes} />;
}

function ClassGridSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-8 w-1/3 mt-4" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
