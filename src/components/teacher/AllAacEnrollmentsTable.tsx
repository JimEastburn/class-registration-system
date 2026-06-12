import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { AllAacEnrollmentReportRow } from '@/lib/actions/classes';

interface AllAacEnrollmentsTableProps {
  rows: AllAacEnrollmentReportRow[];
}

export function AllAacEnrollmentsTable({ rows }: AllAacEnrollmentsTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center justify-center py-12 text-sm">
          No published classes found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table data-testid="all-aac-enrollments-table">
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead>Teacher Name</TableHead>
            <TableHead className="text-right">Capacity</TableHead>
            <TableHead className="text-right">Enrolled</TableHead>
            <TableHead className="text-right">Waitlisted</TableHead>
            <TableHead>Block</TableHead>
            <TableHead>Days Offered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.className}</TableCell>
              <TableCell>{row.teacherName}</TableCell>
              <TableCell className="text-right">{row.capacity}</TableCell>
              <TableCell className="text-right">{row.enrolledCount}</TableCell>
              <TableCell className="text-right">
                {row.waitlistedCount}
              </TableCell>
              <TableCell>{row.block}</TableCell>
              <TableCell>{row.daysOffered}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
