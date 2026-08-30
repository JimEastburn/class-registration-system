'use client';

import type {
  AdminEnrollmentStatusCounts,
  AdminEnrollmentView,
} from '@/lib/actions/enrollments';
import type { EnrollmentStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, MoreHorizontal, XCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AdminEnrollStudentDialog } from './AdminEnrollStudentDialog';
import { ExportCsvButton } from './ExportCsvButton';
import { CancelEnrollmentDialog } from './CancelEnrollmentDialog';
import { adminRemoveEnrollment } from '@/lib/actions/enrollments';
import { cn } from '@/lib/utils';

interface EnrollmentManagementTableProps {
  enrollments: AdminEnrollmentView[];
  matchingCount: number;
  statusCounts: AdminEnrollmentStatusCounts;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  filterError: string | null;
}

const statusConfig: Record<
  EnrollmentStatus,
  { label: string; className: string; dotClassName: string }
> = {
  confirmed: {
    label: 'Confirmed and paid',
    className:
      'border-[var(--status-confirmed-border)] bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed-fg)] hover:bg-[var(--status-confirmed-bg)]',
    dotClassName: 'bg-[var(--status-confirmed-dot)]',
  },
  pending: {
    label: 'Pending',
    className:
      'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)] hover:bg-[var(--status-pending-bg)]',
    dotClassName: 'bg-[var(--status-pending-dot)]',
  },
  waitlisted: {
    label: 'Waitlisted',
    className:
      'border-[var(--status-waitlisted-border)] bg-[var(--status-waitlisted-bg)] text-[var(--status-waitlisted-fg)] hover:bg-[var(--status-waitlisted-bg)]',
    dotClassName: 'bg-[var(--status-waitlisted-dot)]',
  },
  cancelled: {
    label: 'Cancelled',
    className:
      'border-[var(--status-cancelled-border)] bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled-fg)] hover:bg-[var(--status-cancelled-bg)]',
    dotClassName: 'bg-[var(--status-cancelled-dot)]',
  },
};

const statusOrder: EnrollmentStatus[] = [
  'confirmed',
  'pending',
  'waitlisted',
  'cancelled',
];

export function EnrollmentManagementTable({
  enrollments,
  matchingCount,
  statusCounts,
  currentPage,
  totalPages,
  pageSize,
  filterError,
}: EnrollmentManagementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [startDate, setStartDate] = useState(
    searchParams.get('startDate') || ''
  );
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [localFilterError, setLocalFilterError] = useState<string | null>(null);
  const [cancelData, setCancelData] = useState<{
    id: string;
    name: string;
    className: string;
  } | null>(null);
  const [deleteData, setDeleteData] = useState<{
    id: string;
    studentName: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasAppliedFilters =
    !!searchParams.get('search') ||
    (!!searchParams.get('status') && searchParams.get('status') !== 'all') ||
    !!searchParams.get('startDate') ||
    !!searchParams.get('endDate') ||
    (!!searchParams.get('classId') && searchParams.get('classId') !== 'all');

  const buildUrl = (params: URLSearchParams) => {
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const navigateWithFilters = (params: URLSearchParams) => {
    startTransition(() => {
      router.replace(buildUrl(params));
    });
  };

  const hasValidLocalDateRange = () => {
    if (startDate && endDate && startDate > endDate) {
      setLocalFilterError('Start date must be on or before end date.');
      return false;
    }
    setLocalFilterError(null);
    return true;
  };

  const writeLocalFilters = (params: URLSearchParams) => {
    const trimmedSearch = search.trim();
    if (trimmedSearch) params.set('search', trimmedSearch);
    else params.delete('search');

    if (startDate) params.set('startDate', startDate);
    else params.delete('startDate');

    if (endDate) params.set('endDate', endDate);
    else params.delete('endDate');
  };

  const handleDelete = async () => {
    if (!deleteData) return;

    setIsDeleting(true);
    setDeleteError(null);
    const result = await adminRemoveEnrollment(deleteData.id);
    setIsDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    setDeleteData(null);
    router.refresh();
  };

  const handleApplyFilters = () => {
    if (!hasValidLocalDateRange()) return;

    const params = new URLSearchParams(searchParams.toString());
    writeLocalFilters(params);
    params.set('page', '1');
    navigateWithFilters(params);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setLocalFilterError(null);

    const params = new URLSearchParams();
    params.set('page', '1');
    navigateWithFilters(params);
  };

  const handleStatusChange = (status: string) => {
    if (!hasValidLocalDateRange()) return;

    setStatusFilter(status);
    const params = new URLSearchParams(searchParams.toString());
    writeLocalFilters(params);
    if (status === 'all') params.delete('status');
    else params.set('status', status);
    params.set('page', '1');
    navigateWithFilters(params);
  };

  const handleStatusCardClick = (status: EnrollmentStatus) => {
    handleStatusChange(statusFilter === status ? 'all' : status);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    startTransition(() => {
      router.push(buildUrl(params));
    });
  };

  const hasVisibleRecords = matchingCount > 0 && enrollments.length > 0;
  const firstMatchingRecord = hasVisibleRecords
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const lastMatchingRecord = !hasVisibleRecords
    ? 0
    : Math.min(
        firstMatchingRecord + Math.max(enrollments.length - 1, 0),
        matchingCount
      );
  const visibleFilterError = localFilterError || filterError;

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="enrollment-status-heading"
        className="space-y-3"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3
              id="enrollment-status-heading"
              className="text-lg font-semibold text-balance"
            >
              Enrollment status
            </h3>
            <p className="text-muted-foreground text-sm text-pretty">
              Confirmed and pending enrollments hold seats; waitlisted and
              cancelled records do not.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportCsvButton
              type="enrollments"
              currentParams={searchParams.toString()}
              matchingCount={matchingCount}
              disabled={isPending}
            />
            <AdminEnrollStudentDialog />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statusOrder.map((status) => {
            const config = statusConfig[status];
            const selected = statusFilter === status;
            return (
              <Button
                key={status}
                type="button"
                variant="outline"
                aria-label={`${config.label}: ${statusCounts[status]}`}
                aria-pressed={selected}
                onClick={() => handleStatusCardClick(status)}
                disabled={isPending}
                className={cn(
                  'h-auto min-h-24 w-full flex-col items-start gap-2 p-4 text-left whitespace-normal',
                  config.className,
                  selected &&
                    'ring-ring ring-offset-background ring-2 ring-offset-2'
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden="true"
                    className={cn('size-2.5 rounded-full', config.dotClassName)}
                  />
                  {config.label}
                </span>
                <span className="text-2xl font-bold tabular-nums">
                  {statusCounts[status]}
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      <div className="bg-muted/20 rounded-md border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label htmlFor="enrollment-search">Student name</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                id="enrollment-search"
                placeholder="Search student name..."
                className="bg-background pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleApplyFilters();
                }}
              />
            </div>
          </div>

          <div className="w-full space-y-1.5 sm:w-48">
            <Label htmlFor="enrollment-status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger
                id="enrollment-status-filter"
                aria-label="Filter by status"
                className="bg-background w-full"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed and paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="enrollment-start-date">Start date</Label>
            <Input
              id="enrollment-start-date"
              type="date"
              value={startDate}
              max={endDate || undefined}
              aria-invalid={!!visibleFilterError}
              onChange={(event) => {
                setStartDate(event.target.value);
                setLocalFilterError(null);
              }}
              className="bg-background"
            />
          </div>

          <div className="w-full space-y-1.5 sm:w-40">
            <Label htmlFor="enrollment-end-date">End date</Label>
            <Input
              id="enrollment-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              aria-invalid={!!visibleFilterError}
              onChange={(event) => {
                setEndDate(event.target.value);
                setLocalFilterError(null);
              }}
              className="bg-background"
            />
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              disabled={isPending}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={handleApplyFilters}
              isLoading={isPending}
            >
              Apply filters
            </Button>
          </div>
        </div>

        {visibleFilterError && (
          <p role="alert" className="text-destructive mt-2 text-sm">
            {visibleFilterError}
          </p>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrollment date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-muted-foreground text-pretty">
                      {hasAppliedFilters
                        ? 'No enrollments match the current filters.'
                        : 'No enrollment records found.'}
                    </p>
                    {hasAppliedFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        disabled={isPending}
                      >
                        Clear filters and show all enrollments
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div className="font-medium">
                      {enrollment.student.first_name}{' '}
                      {enrollment.student.last_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {enrollment.class?.name || 'Unknown Class'}
                  </TableCell>
                  <TableCell>
                    {enrollment.student.parent
                      ? `${enrollment.student.parent.first_name} ${enrollment.student.parent.last_name}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={enrollment.status}
                      waitlistPosition={enrollment.waitlist_position}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {new Date(enrollment.created_at).toLocaleDateString(
                      'en-US',
                      { timeZone: 'America/Chicago' }
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Open actions for ${enrollment.student.first_name} ${enrollment.student.last_name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(enrollment.id)
                          }
                        >
                          Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setCancelData({
                              id: enrollment.id,
                              name: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                              className:
                                enrollment.class?.name || 'Unknown Class',
                            })
                          }
                        >
                          <XCircle /> Cancel
                        </DropdownMenuItem>
                        {process.env.NEXT_PUBLIC_VERCEL_ENV !==
                          'production' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteData({
                                id: enrollment.id,
                                studentName: `${enrollment.student.first_name} ${enrollment.student.last_name}`,
                              });
                            }}
                          >
                            <Trash2 /> Hard Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {cancelData && (
        <CancelEnrollmentDialog
          open={!!cancelData}
          onOpenChange={(open) => !open && setCancelData(null)}
          enrollmentId={cancelData.id}
          studentName={cancelData.name}
          className={cancelData.className}
        />
      )}

      <AlertDialog
        open={!!deleteData}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteData(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete enrollment permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteData?.studentName
                ? `This permanently deletes ${deleteData.studentName}'s enrollment record. This action cannot be undone.`
                : 'This permanently deletes the enrollment record. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-destructive text-sm">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Keep record
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-muted-foreground text-sm tabular-nums">
          {matchingCount === 0
            ? 'Showing 0 of 0 matching records'
            : hasVisibleRecords
              ? `Showing ${firstMatchingRecord}–${lastMatchingRecord} of ${matchingCount} matching ${matchingCount === 1 ? 'record' : 'records'}`
              : `Showing 0 of ${matchingCount} matching records`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Previous
          </Button>
          <span className="text-sm font-medium tabular-nums">
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  waitlistPosition,
}: {
  status: EnrollmentStatus;
  waitlistPosition?: number | null;
}) {
  const config = statusConfig[status];
  const label =
    status === 'waitlisted' && waitlistPosition
      ? `#${waitlistPosition} on Waitlist`
      : config.label;

  return (
    <Badge variant="outline" className={config.className}>
      {label}
    </Badge>
  );
}
