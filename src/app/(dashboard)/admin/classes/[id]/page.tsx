
import { getClassDetails } from '@/lib/actions/classes';
import { getClassRoster } from '@/lib/actions/enrollments';
import AdminRosterTable from '@/components/admin/AdminRosterTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';

export const metadata = {
    title: 'Class Details',
};

export default async function AdminClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // Parallel fetch
    const [classRes, rosterRes] = await Promise.all([
        getClassDetails(id),
        getClassRoster(id)
    ]);

    const cls = classRes.data;
    const enrollments = rosterRes.data || [];

    if (!cls) {
        return notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/admin/classes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{cls.name}</h1>
                        <p className="text-muted-foreground">
                            {cls.teacher?.first_name} {cls.teacher?.last_name}
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/admin/classes/${id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Class
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Class Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant={
                                cls.status === 'published' ? 'default' :
                                cls.status === 'draft' ? 'secondary' :
                                cls.status === 'completed' ? 'outline' : 'destructive'
                            }>
                                {cls.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span>{formatCurrency(cls.price, true)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Capacity:</span>
                            <span>{cls.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Schedule:</span>
                             <span>{cls.day || 'TBD'} - {cls.block || 'TBD'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates:</span>
                            <span>{cls.start_date} - {cls.end_date}</span>
                        </div>
                        <div className="flex justify-between">
                             <span className="text-muted-foreground">Teacher Email:</span>
                             {/* cls.teacher.email is available now due to prev fix */}
                             <span>{cls.teacher?.email}</span>
                        </div>
                         <div className="mt-4">
                            <p className="text-sm text-muted-foreground mb-1">Description:</p>
                            <p className="text-sm">{cls.description}</p>
                         </div>
                    </CardContent>
                 </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle>Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Placeholder for stats like revenue, fill rate */}
                        <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-muted-foreground">Enrolled Students:</span>
                            <span className="text-xl font-bold">{enrollments.length} / {cls.capacity}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                             <span className="text-muted-foreground">Waitlisted:</span>
                             <span className="text-xl font-bold">
                                {enrollments.filter(e => e.status === 'waitlisted').length}
                             </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Estimated Revenue:</span>
                            <span className="text-xl font-bold text-green-600">
                                {formatCurrency(enrollments.filter(e => e.status === 'confirmed').length * cls.price, true)}
                            </span>
                        </div>
                    </CardContent>
                 </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Roster</h2>
                <AdminRosterTable enrollments={enrollments} />
            </div>
        </div>
    );
}
