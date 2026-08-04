'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Class } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Edit, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { schedulerUpdateClass } from '@/lib/actions/scheduler';
import { ClassCapacityBadge } from '@/components/classes/ClassCapacityBadge';
import type { EnrollmentCounts } from '@/lib/enrollment-counts';

interface SchedulerClassTableProps {
  classes: (Class &
    EnrollmentCounts & {
      teacher?: {
        first_name: string | null;
        last_name: string | null;
        email: string;
      };
    })[]; // Extended type
  count: number;
  conflictClassIds?: string[];
}

export function SchedulerClassTable({ classes, conflictClassIds = [] }: SchedulerClassTableProps) {
  const conflictSet = new Set(conflictClassIds);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Helper to format schedule
  const formatSchedule = (config: Class['schedule_config']) => {
    if (!config || !config.day || !config.block) return 'Unscheduled';
    const dates =
      config.startDate && config.endDate
        ? ` • ${config.startDate}–${config.endDate}`
        : '';
    return `${config.day} • ${config.block}${dates}`;
  };

  const handleTogglePublished = (cls: Class, checked: boolean) => {
    const newStatus = checked ? 'published' : 'draft';

    // Enforce same rules as publishClass: day and block must be assigned
    if (newStatus === 'published') {
      const config = cls.schedule_config as { day?: string; block?: string } | null;
      if (!config?.day || !config?.block) {
        toast.error('Day and Block must be assigned before publishing.');
        return;
      }
    }

    startTransition(async () => {
      const result = await schedulerUpdateClass(cls.id, { status: newStatus });
      if (result.success) {
        toast.success(`Class "${cls.name}" ${newStatus === 'published' ? 'published' : 'set to draft'}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Conflict</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No classes found.
              </TableCell>
            </TableRow>
          ) : (
            classes.map((cls) => {
              const hasConflict = conflictSet.has(cls.id);
              const canToggle = cls.status === 'draft' || cls.status === 'published';
              return (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>
                    {cls.teacher
                      ? `${cls.teacher.first_name ?? ''} ${cls.teacher.last_name ?? ''}`.trim() ||
                        cls.teacher.email
                      : 'Unknown'}
                  </TableCell>
                  <TableCell>{cls.location || 'TBD'}</TableCell>
                  <TableCell>{formatSchedule(cls.schedule_config)}</TableCell>
                  <TableCell>
                    <ClassCapacityBadge
                      seatsTaken={cls.enrolled_count}
                      capacity={cls.capacity}
                      variant="compact"
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cls.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : cls.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cls.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={cls.status === 'published'}
                      onCheckedChange={(checked) => handleTogglePublished(cls, checked)}
                      disabled={!canToggle || isPending}
                      aria-label={`Toggle published status for ${cls.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {hasConflict ? (
                      <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle2 className="h-4 w-4 opacity-40" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/class-scheduler/classes/${cls.id}`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
