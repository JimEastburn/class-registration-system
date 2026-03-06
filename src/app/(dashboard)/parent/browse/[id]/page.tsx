import { notFound } from 'next/navigation';
import { Clock, Calendar, User, MapPin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getClassDetails, getClassAvailability } from '@/lib/actions/classes';
import { getEnrollmentsForFamily } from '@/lib/actions/enrollments';
import { getMaterialsForClass } from '@/lib/actions/materials';
import { EnrollButton } from '@/components/classes/EnrollButton';
import { ClassMaterialsList } from '@/components/classes/ClassMaterialsList';
import { BackButton } from '@/components/ui/BackButton';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const { data } = await getClassDetails(id);

  if (!data) {
    return { title: 'Class Not Found' };
  }

  return {
    title: `${data.name} | Class Registration System`,
    description: data.description || 'View class details and enroll',
  };
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const { id } = await params;
  const [classResult, availabilityResult, enrollmentsResult] =
    await Promise.all([
      getClassDetails(id),
      getClassAvailability(id),
      getEnrollmentsForFamily(),
    ]);

  if (classResult.error || !classResult.data) {
    notFound();
  }

  const classItem = classResult.data;
  const availability = availabilityResult;
  const enrollments = enrollmentsResult.data || [];

  const isEnrolled = enrollments.some(
    (e) => e.class_id === id && e.status === 'confirmed'
  );

  let materials = null;
  if (isEnrolled) {
    const materialsResult = await getMaterialsForClass(id);
    if (materialsResult.success) {
      materials = materialsResult.data;
    }
  }

  const teacherName = classItem.teacher
    ? `${classItem.teacher.first_name || ''} ${classItem.teacher.last_name || ''}`.trim()
    : 'TBD';

  const schedule = classItem.schedule_config;
  const day = schedule?.day || 'TBD';
  const block = schedule?.block || 'TBD';

  return (
    <div className="space-y-6">
      <ScrollToTop />
      <div className="flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {classItem.name}
          </h1>
          <p className="text-muted-foreground">with {teacherName}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>About This Class</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {classItem.description || 'No description available.'}
              </p>
            </CardContent>
          </Card>

          {/* Check if isEnrolled to show materials */}
          {isEnrolled && <ClassMaterialsList materials={materials} />}

          <Card>
            <CardHeader>
              <CardTitle>Schedule & Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {day && (
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Calendar className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Day</p>
                      <p className="text-muted-foreground text-sm">{day}</p>
                    </div>
                  </div>
                )}

                {block && (
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Clock className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Block</p>
                      <p className="text-muted-foreground text-sm">{block}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <User className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Instructor</p>
                    <p className="text-muted-foreground text-sm">
                      {teacherName}
                    </p>
                  </div>
                </div>

                {classItem.location && (
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <MapPin className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-muted-foreground text-sm">
                        {classItem.location}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">$30.00</CardTitle>
              <CardDescription>community fee per enrollment</CardDescription>
              {classItem.show_payment_info !== false && (
                <p className="text-sm text-muted-foreground mt-1">Class payment, paid directly to the teacher later, is $255 for a one day a week class per semester, and the two day a week classes are $500 per semester.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Capacity</span>
                <span className="font-medium">{availability.capacity}</span>
              </div>



              <EnrollButton
                classId={classItem.id}
                className={classItem.name}
                available={availability.available}
                showPaymentInfo={classItem.show_payment_info !== false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
