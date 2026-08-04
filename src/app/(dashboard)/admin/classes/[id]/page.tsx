import { getClassDetails } from '@/lib/actions/classes';
import { getClassRoster } from '@/lib/actions/enrollments';
import AdminRosterTable from '@/components/admin/AdminRosterTable';
import { ClassCapacityBadge } from '@/components/classes/ClassCapacityBadge';
import { computeEnrollmentStatusCounts } from '@/lib/logic/enrollment-helpers';
import { withClassListState } from '@/lib/class-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';

export const metadata = {
  title: 'Class Details',
};

export default async function AdminClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, listState] = await Promise.all([params, searchParams]);

  // Parallel fetch
  const [classRes, rosterRes] = await Promise.all([
    getClassDetails(id),
    getClassRoster(id),
  ]);

  const cls = classRes.data;
  const enrollments = rosterRes.data || [];

  if (!cls) {
    return notFound();
  }

  const statusCounts = computeEnrollmentStatusCounts(enrollments);
  // Seats held: pending + confirmed, matching enroll_student's capacity rule.
  const seatsTaken = statusCounts.enrolled + statusCounts.confirmed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            {/* The list's page/sort/search ride along on the row link that
                opened this page, so going back lands where the admin left. */}
            <Link
              href={withClassListState('/admin/classes', listState)}
              aria-label="Back to classes"
            >
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
          <Link
            href={withClassListState(`/admin/classes/${id}/edit`, listState)}
          >
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
              <Badge
                variant={
                  cls.status === 'published'
                    ? 'default'
                    : cls.status === 'draft'
                      ? 'secondary'
                      : cls.status === 'completed'
                        ? 'outline'
                        : 'destructive'
                }
              >
                {cls.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span>$30.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity:</span>
              <span>{cls.capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule:</span>
              <span>
                {cls.day || 'TBD'} - {cls.block || 'TBD'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dates:</span>
              <span>
                {cls.start_date} - {cls.end_date}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teacher Email:</span>
              {/* cls.teacher.email is available now due to prev fix */}
              <span>{cls.teacher?.email}</span>
            </div>
            <div className="mt-4">
              <p className="text-muted-foreground mb-1 text-sm">Description:</p>
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
            <div className="flex items-start justify-between border-b pb-2">
              <span className="text-muted-foreground">Enrolled Students:</span>
              <div className="text-right">
                <span className="text-xl font-bold">
                  {seatsTaken} / {cls.capacity}
                </span>
                <ClassCapacityBadge
                  seatsTaken={seatsTaken}
                  capacity={cls.capacity}
                  waitlistedCount={statusCounts.waitlisted}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-muted-foreground">Waitlisted:</span>
              <span className="text-xl font-bold">
                {statusCounts.waitlisted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated Revenue:</span>
              <span className="text-xl font-bold text-green-600">
                $
                {(
                  enrollments.filter((e) => e.status === 'confirmed').length *
                  30
                ).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Roster</h2>
        <AdminRosterTable enrollments={enrollments} classId={id} />
      </div>
    </div>
  );
}
