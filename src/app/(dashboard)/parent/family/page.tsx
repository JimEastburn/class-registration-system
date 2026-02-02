import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getFamilyMembers } from '@/lib/actions/family';
import { FamilyMemberList } from '@/components/family/FamilyMemberList';
import { AddFamilyMemberDialog } from '@/components/family/AddFamilyMemberDialog';

export const metadata = {
    title: 'My Family | Class Registration System',
    description: 'Manage your family members',
};

export default async function FamilyPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/parent">
                            <ArrowLeft className="h-5 w-5" />
                            <span className="sr-only">Back to Dashboard</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            My Family
                        </h1>
                        <p className="text-muted-foreground">
                            Add and manage family members who can enroll in classes
                        </p>
                    </div>
                </div>
                <AddFamilyMemberDialog>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                    </Button>
                </AddFamilyMemberDialog>
            </div>

            <Suspense fallback={<FamilyListSkeleton />}>
                <FamilyMemberListWrapper />
            </Suspense>
        </div>
    );
}

async function FamilyMemberListWrapper() {
    const { data: members, error } = await getFamilyMembers();

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>
                        Failed to load family members: {error}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!members || members.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Family Members</CardTitle>
                    <CardDescription>
                        You haven&apos;t added any family members yet. Add a family
                        member to start enrolling them in classes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AddFamilyMemberDialog>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Family Member
                        </Button>
                    </AddFamilyMemberDialog>
                </CardContent>
            </Card>
        );
    }

    return <FamilyMemberList members={members} />;
}

function FamilyListSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
