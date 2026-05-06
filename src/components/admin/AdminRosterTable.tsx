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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Trash2, ArrowUp, Info } from 'lucide-react';
import { cancelEnrollment } from '@/lib/actions/enrollments';
import { promoteWaitlistEntryAsAdmin } from '@/lib/actions/waitlist';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

interface AdminRosterTableProps {
  enrollments: RosterEnrollment[];
  classId: string;
}

export default function AdminRosterTable({
  enrollments,
  classId,
}: AdminRosterTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const waitlisted = enrollments.filter((e) => e.status === 'waitlisted');
  const hasWaitlist = waitlisted.length > 0;

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

  const handlePromote = () => {
    if (
      !confirm(
        'Promote the next waitlisted student to pending enrollment?'
      )
    )
      return;

    startTransition(async () => {
      const res = await promoteWaitlistEntryAsAdmin(classId);
      if (res.success && res.data) {
        toast.success('Student promoted from waitlist');
        router.refresh();
      } else if (res.success && !res.data) {
        toast.info('No waitlisted students to promote');
      } else if (!res.success) {
        toast.error(res.error || 'Failed to promote from waitlist');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border p-4">
        <div>
          <p className="font-medium">
            {hasWaitlist
              ? `${waitlisted.length} student${waitlisted.length !== 1 ? 's' : ''} on waitlist`
              : 'No students on waitlist'}
          </p>
          <p className="text-muted-foreground text-sm">
            Promoting moves the next student to pending enrollment.
          </p>
        </div>
        <TooltipProvider>
          <div className="flex flex-col items-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="text-muted-foreground h-4 w-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" align="end">
                <p className="max-w-[240px]">
                  If there are waitlisted students this button will allow you to
                  click it to move the first waitlisted student into the class
                </p>
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={handlePromote}
              disabled={!hasWaitlist || isPending}
              size="sm"
              className={!hasWaitlist ? 'cursor-not-allowed' : undefined}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Promote Next
            </Button>
          </div>
        </TooltipProvider>
      </div>

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
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No students enrolled.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {enrollment.student.first_name} {enrollment.student.last_name}
                    {enrollment.isBlocked && (
                      <span className="text-destructive ml-2">(Blocked)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {enrollment.student.parent
                      ? `${enrollment.student.parent.first_name} ${enrollment.student.parent.last_name}`
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{enrollment.student.parent?.email}</span>
                      <span className="text-muted-foreground">
                        {enrollment.student.parent?.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EnrollmentStatusBadge
                      status={enrollment.status}
                      waitlistPosition={enrollment.waitlist_position}
                    />
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
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="text-muted-foreground p-4 text-sm">
          Total: {enrollments.length}
        </div>
      </div>
    </div>
  );
}
