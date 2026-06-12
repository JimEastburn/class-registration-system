import { redirect } from 'next/navigation';
import { AllAacEnrollmentsTable } from '@/components/teacher/AllAacEnrollmentsTable';
import { getAllAacEnrollmentReport } from '@/lib/actions/classes';

export const metadata = {
  title: 'All AAC Enrollments | Teacher Portal',
  description: 'View published AAC class enrollment totals',
};

export default async function AllAacEnrollmentsPage() {
  const result = await getAllAacEnrollmentReport();

  if (!result.success) {
    if (result.error === 'Not authenticated') {
      redirect('/login');
    }

    if (result.error === 'Not authorized') {
      redirect('/');
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Unable to load AAC enrollments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          All AAC Enrollments
        </h1>
        <p className="text-muted-foreground">
          Published class capacity, enrollment, waitlist, and schedule totals.
        </p>
      </div>

      <AllAacEnrollmentsTable rows={result.data} />
    </div>
  );
}
