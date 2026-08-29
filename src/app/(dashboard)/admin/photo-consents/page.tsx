import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getPhotoConsentRoster } from '@/lib/actions/admin';

export const metadata = {
  title: 'Photo Consents | Class Registration System',
  description: 'Review student photo consent records',
};

export default async function PhotoConsentsPage() {
  const { data: students, error } = await getPhotoConsentRoster();

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
          Review the photo consent status submitted by each student&apos;s
          parent or guardian.
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Parent or Guardian</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Photo Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.studentName}
                    </TableCell>
                    <TableCell>{student.grade || '—'}</TableCell>
                    <TableCell>{student.parentName}</TableCell>
                    <TableCell>{student.parentEmail}</TableCell>
                    <TableCell>
                      <Badge
                        variant={student.photoConsent ? 'default' : 'secondary'}
                      >
                        {student.photoConsent ? 'Granted' : 'Not granted'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
