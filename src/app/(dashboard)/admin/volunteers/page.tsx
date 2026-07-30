import {
  getVolunteerActivityLog,
  getVolunteerBoard,
} from '@/lib/actions/volunteers';
import { AdminVolunteerConfig } from '@/components/volunteers/AdminVolunteerConfig';

export const metadata = {
  title: 'Volunteer Configuration',
};

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ volunteerLogPage?: string }>;
}) {
  const params = await searchParams;
  const volunteerLogPage = Math.max(
    1,
    Number(params.volunteerLogPage || '1') || 1
  );
  const [result, activityLogResult] = await Promise.all([
    getVolunteerBoard(),
    getVolunteerActivityLog(volunteerLogPage),
  ]);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Volunteer Configuration
        </h1>
        <p className="text-muted-foreground mt-2">
          Set up the volunteer board that families see at{' '}
          <span className="font-medium">/volunteer</span>. Add your roles and
          time blocks, check which roles are needed during each block, and
          manage who has signed up.
        </p>
      </div>

      {result.success ? (
        <AdminVolunteerConfig
          board={result.data}
          activityLog={
            activityLogResult.success ? activityLogResult.data : null
          }
          activityLogError={
            activityLogResult.success ? null : activityLogResult.error
          }
        />
      ) : (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-6 text-sm">
          {result.error}
        </div>
      )}
    </div>
  );
}
