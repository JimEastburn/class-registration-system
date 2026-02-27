'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { EnrollmentTable } from './EnrollmentTable';
import {
  EnrollmentCalendarGrid,
  type EnrollmentForCalendar,
} from './EnrollmentCalendarGrid';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cancelEnrollment } from '@/lib/actions/enrollments';
import type { Enrollment, ScheduleConfig } from '@/types';

interface EnrollmentWithClass extends Enrollment {
  class: {
    id: string;
    name: string;
    teacher_id: string;
    price: number;
    day: string | null;
    block: string | null;
    location: string | null;
    schedule_config: ScheduleConfig | null;
    teacher: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface EnrollmentListClientProps {
  enrollments: EnrollmentWithClass[];
}

export function EnrollmentListClient({
  enrollments: initialEnrollments,
}: EnrollmentListClientProps) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [calendarView, setCalendarView] = useState(false);

  async function handleCancel(enrollmentId: string) {
    const { success, error } = await cancelEnrollment(enrollmentId);

    if (error || !success) {
      toast.error(error || 'Failed to cancel enrollment');
    } else {
      toast.success('Enrollment cancelled successfully');
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    }
  }

  // Map enrollments to per-student calendar entries
  const calendarEnrollments = useMemo<EnrollmentForCalendar[]>(() => {
    return enrollments
      .filter((e) => e.class && e.student && e.status !== 'cancelled')
      .map((e) => {
        const cls = e.class!;
        const student = e.student!;
        const teacherName = cls.teacher
          ? `${cls.teacher.first_name || ''} ${cls.teacher.last_name || ''}`.trim()
          : 'TBD';

        return {
          classId: cls.id,
          className: cls.name,
          location: cls.location,
          scheduleConfig: cls.schedule_config,
          teacherName,
          studentId: student.id,
          studentName: `${student.first_name} ${student.last_name}`,
        };
      });
  }, [enrollments]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          id="enrollment-calendar-toggle"
          checked={calendarView}
          onCheckedChange={setCalendarView}
        />
        <Label htmlFor="enrollment-calendar-toggle" className="cursor-pointer text-sm">
          Show calendar view
        </Label>
      </div>

      {calendarView ? (
        <EnrollmentCalendarGrid enrollments={calendarEnrollments} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Enrollments</CardTitle>
            <CardDescription>
              A list of all enrollments for your family members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollmentTable
              enrollments={enrollments}
              onCancel={handleCancel}
              showStudent={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
