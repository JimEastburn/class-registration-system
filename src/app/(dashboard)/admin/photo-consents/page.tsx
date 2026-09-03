import { PhotoConsentActivityLog } from '@/components/admin/PhotoConsentActivityLog';
import { PhotoConsentTable } from '@/components/admin/PhotoConsentTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getPhotoConsentActivityLog,
  getPhotoConsentRoster,
} from '@/lib/actions/admin';

export const metadata = {
  title: 'Photo Consents | Class Registration System',
  description: 'Review and manage student photo consent records',
};

export default async function PhotoConsentsPage({
  searchParams,
}: {
  searchParams: Promise<{ photoConsentLogPage?: string }>;
}) {
  const params = await searchParams;
  const activityLogPage = Math.max(
    1,
    Number(params.photoConsentLogPage || '1') || 1
  );
  const [rosterResult, activityLogResult] = await Promise.all([
    getPhotoConsentRoster(),
    getPhotoConsentActivityLog(activityLogPage),
  ]);
  const { data: students, error } = rosterResult;

  if (error || !students) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">
            Unable to load photo consents
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {error || 'An unexpected error occurred'}
        </CardContent>
      </Card>
    );
  }

  const consentedCount = students.filter(
    (student) => student.photoConsent
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Consents</h1>
        <p className="text-muted-foreground mt-2">
          Review, grant, or remove photo consent for any student. Changes are
          recorded in the Photo Consent Activity Log.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {students.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Consent Granted
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {consentedCount}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Consent Records</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No students have been added yet.
            </p>
          ) : (
            <PhotoConsentTable rows={students} />
          )}
        </CardContent>
      </Card>

      <PhotoConsentActivityLog
        activityLog={activityLogResult.data}
        activityLogError={activityLogResult.error}
      />
    </div>
  );
}
