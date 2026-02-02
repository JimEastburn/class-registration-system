'use client';

import { RosterEnrollment } from '@/lib/actions/enrollments';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EnrollmentStatusBadge } from '@/components/classes/EnrollmentStatusBadge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cancelEnrollment } from '@/lib/actions/enrollments';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface AdminRosterTableProps {
  enrollments: RosterEnrollment[];
}

export default function AdminRosterTable({ enrollments }: AdminRosterTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = (enrollmentId: string) => {
    if (!confirm('Are you sure you want to cancel this enrollment?')) return;

    startTransition(async () => {
      const res = await cancelEnrollment(enrollmentId);
      if (res.success) {
        toast.success('Enrollment cancelled');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to cancel enrollment');
      }
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Parent Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Waitlist</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No students enrolled.
              </TableCell>
            </TableRow>
          ) : (
            enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell className="font-medium">
                  {enrollment.student.first_name} {enrollment.student.last_name}
                  {enrollment.isBlocked && <span className="text-destructive ml-2">(Blocked)</span>}
                </TableCell>
                <TableCell>
                  {enrollment.student.parent 
                    ? `${enrollment.student.parent.first_name} ${enrollment.student.parent.last_name}`
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-sm">
                     <span>{enrollment.student.parent?.email}</span>
                     <span className="text-muted-foreground">{enrollment.student.parent?.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <EnrollmentStatusBadge status={enrollment.status} waitlistPosition={null} />
                </TableCell>
                <TableCell>{enrollment.waitlist_position || '-'}</TableCell>
                <TableCell className="text-right">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleCancel(enrollment.id)}
                      disabled={isPending}
                      title="Cancel Enrollment"
                   >
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
       <div className="p-4 text-sm text-muted-foreground">
          Total: {enrollments.length}
      </div>
    </div>
  );
}
