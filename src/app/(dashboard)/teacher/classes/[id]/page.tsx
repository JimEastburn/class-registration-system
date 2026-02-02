import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Edit, Users, Calendar, MapPin, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClassDetails, getClassAvailability } from '@/lib/actions/classes';
import { getClassRoster } from '@/lib/actions/enrollments';
import { StudentRosterTable } from '@/components/teacher/StudentRosterTable';

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  active: { label: 'Active', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
};

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params;
  
  const [classResult, availabilityResult, rosterResult] = await Promise.all([
    getClassDetails(id),
    getClassAvailability(id),
    getClassRoster(id),
  ]);

  if (!classResult.data) {
    notFound();
  }

  const classData = classResult.data;
  const availability = availabilityResult;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/teacher/classes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
              <Badge variant={statusConfig[classData.status]?.variant || 'outline'}>
                {statusConfig[classData.status]?.label || classData.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {classData.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/teacher/classes/${id}/materials`}>
              <FileText className="mr-2 h-4 w-4" />
              Materials
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/teacher/classes/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Class
            </Link>
          </Button>
        </div>
      </div>

      {/* Class Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availability.enrolled}/{availability.capacity}
            </div>
            <p className="text-xs text-muted-foreground">
              {availability.available} spots available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classData.day || 'TBA'}
            </div>
            <p className="text-xs text-muted-foreground">
              {classData.block || 'TBA'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {classData.location || 'TBA'}
            </div>
            <p className="text-xs text-muted-foreground">
              Class location
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(classData.price / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per enrollment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Class Details */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Details</CardTitle>
            <CardDescription>Additional information about this class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <p className="font-medium">
                  {classData.start_date
                    ? new Date(classData.start_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <p className="font-medium">
                  {classData.end_date
                    ? new Date(classData.end_date).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Age Range:</span>
                <p className="font-medium">
                  {classData.age_min || classData.age_max
                    ? `${classData.age_min || 0} - ${classData.age_max || '∞'} years`
                    : 'All ages welcome'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">
                  {new Date(classData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Roster */}
        <StudentRosterTable enrollments={rosterResult.data || []} classId={id} />
      </div>
    </div>
  );
}
