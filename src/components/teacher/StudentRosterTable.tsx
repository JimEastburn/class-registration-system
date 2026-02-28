'use client';

import { useState } from 'react';
import {
  Mail,
  Phone,
  Calendar,
  MoreHorizontal,
  Ban,
  Unlock,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { RosterEnrollment } from '@/lib/actions/enrollments';
import { updateDepositPaid } from '@/lib/actions/enrollments';
import { BlockStudentDialog } from './BlockStudentDialog';
import { unblockStudentByStudentId } from '@/lib/actions/blocking';
import { toast } from 'sonner';

interface StudentRosterTableProps {
  enrollments: RosterEnrollment[];
  classId: string; // To help with revalidation path if needed, though we use generic paths mostly
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  confirmed: { label: 'Enrolled', variant: 'default' },
  waitlisted: { label: 'Waitlist', variant: 'secondary' },
  pending: { label: 'Pending Payment', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function StudentRosterTable({
  enrollments,
  classId,
}: StudentRosterTableProps) {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Optimistic state for deposit checkboxes
  const [depositState, setDepositState] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const e of enrollments) {
        initial[e.id] = e.deposit_paid;
      }
      return initial;
    }
  );

  const handleDepositChange = async (
    enrollmentId: string,
    checked: boolean
  ) => {
    // Optimistic update
    setDepositState((prev) => ({ ...prev, [enrollmentId]: checked }));

    const result = await updateDepositPaid(enrollmentId, checked, classId);
    if (!result.success) {
      // Revert on failure
      setDepositState((prev) => ({ ...prev, [enrollmentId]: !checked }));
      toast.error(result.error || 'Failed to update deposit status');
    }
  };

  const handleBlockClick = (student: {
    id: string;
    first_name: string;
    last_name: string;
  }) => {
    setSelectedStudent({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
    });
    setBlockDialogOpen(true);
  };

  const handleUnblockClick = async (studentId: string) => {
    setProcessing(studentId);
    try {
      // Revalidate the class page
      const result = await unblockStudentByStudentId(
        studentId,
        `/teacher/classes/${classId}`
      );
      if (result.success) {
        toast.success('Student unblocked');
      } else {
        toast.error(result.error || 'Failed to unblock');
      }
    } catch (_err) {
      toast.error('Unexpected error');
    } finally {
      setProcessing(null);
    }
  };

  if (enrollments.length === 0) {
    // ... empty state ... (keeping it simple or same as before)
    return (
      <Card>
        <CardContent className="text-muted-foreground flex flex-col items-center justify-center py-12">
          <Ban className="mb-4 h-12 w-12 opacity-20" />
          <p>No students enrolled yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Student Roster ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data-testid="student-roster-table">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid $25 deposit</TableHead>
                <TableHead>Parent / Guardian</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => {
                const studentName = `${enrollment.student.first_name} ${enrollment.student.last_name}`;
                const parent = enrollment.student.parent;
                const parentName = parent
                  ? `${parent.first_name || 'N/A'} ${parent.last_name || ''}`.trim()
                  : 'Unknown Parent';

                const initials = `${enrollment.student.first_name[0]}${enrollment.student.last_name[0]}`;
                const isBlocked = enrollment.isBlocked;

                return (
                  <TableRow
                    key={enrollment.id}
                    data-testid={`student-row-${enrollment.student.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{studentName}</span>
                            {isBlocked && (
                              <Badge
                                variant="destructive"
                                className="h-4 px-1 py-0 text-[10px]"
                              >
                                Blocked
                              </Badge>
                            )}
                          </div>
                          {enrollment.waitlist_position && (
                            <span className="text-muted-foreground text-xs">
                              Position: #{enrollment.waitlist_position}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusConfig[enrollment.status]?.variant || 'outline'
                        }
                      >
                        {statusConfig[enrollment.status]?.label ||
                          enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={depositState[enrollment.id] ?? enrollment.deposit_paid}
                        onCheckedChange={(checked) =>
                          handleDepositChange(
                            enrollment.id,
                            checked === true
                          )
                        }
                        aria-label={`Mark deposit paid for ${studentName}`}
                      />
                    </TableCell>
                    <TableCell>{parentName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {parent?.email && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <a
                              href={`mailto:${parent.email}`}
                              className="hover:underline"
                            >
                              {parent.email}
                            </a>
                          </div>
                        )}
                        {parent?.phone && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{parent.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(enrollment.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            data-testid="student-actions-trigger"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {isBlocked ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleUnblockClick(enrollment.student.id)
                              }
                              disabled={processing === enrollment.student.id}
                            >
                              <Unlock className="mr-2 h-4 w-4" /> Unblock
                              Student
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleBlockClick(enrollment.student)
                              }
                              data-testid="block-student-button"
                            >
                              <Ban className="mr-2 h-4 w-4" /> Block Student
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-muted-foreground"
                            disabled
                          >
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>

        <BlockStudentDialog
          open={blockDialogOpen}
          onOpenChange={setBlockDialogOpen}
          studentId={selectedStudent?.id || ''}
          studentName={selectedStudent?.name || ''}
          path={`/teacher/classes/${classId}`}
        />
      </Card>
    </>
  );
}
