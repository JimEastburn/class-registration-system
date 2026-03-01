'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Search, X, Minus, Plus } from 'lucide-react';
import { EnrollmentTable } from './EnrollmentTable';
import {
  EnrollmentCalendarGrid,
  type EnrollmentForCalendar,
} from './EnrollmentCalendarGrid';
import { ViewToggle } from '@/components/classes/ViewToggle';
import { Input } from '@/components/ui/input';
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
    age_min: number | null;
    age_max: number | null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [childAge, setChildAge] = useState('0');

  async function handleCancel(enrollmentId: string) {
    const { success, error } = await cancelEnrollment(enrollmentId);

    if (error || !success) {
      toast.error(error || 'Failed to cancel enrollment');
    } else {
      toast.success('Enrollment cancelled successfully');
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    }
  }

  // Apply text search filter
  let filteredEnrollments = searchQuery
    ? enrollments.filter((e) => {
        if (!e.class) return false;
        const query = searchQuery.toLowerCase();
        const cls = e.class;
        const teacherName = cls.teacher
          ? `${cls.teacher.first_name || ''} ${cls.teacher.last_name || ''}`.trim().toLowerCase()
          : '';
        const studentName = e.student
          ? `${e.student.first_name} ${e.student.last_name}`.toLowerCase()
          : '';
        const day = cls.schedule_config?.day?.toLowerCase() || '';
        const block = cls.schedule_config?.block?.toLowerCase() || '';
        return (
          cls.name.toLowerCase().includes(query) ||
          teacherName.includes(query) ||
          studentName.includes(query) ||
          day.includes(query) ||
          block.includes(query)
        );
      })
    : enrollments;

  // Apply age filter
  const ageValue = childAge ? parseInt(childAge, 10) : 0;
  if (ageValue > 0 && !isNaN(ageValue)) {
    filteredEnrollments = filteredEnrollments.filter((e) => {
      if (!e.class) return false;
      const cls = e.class;
      // Classes with no age range are always shown
      if (cls.age_min == null && cls.age_max == null) return true;
      // Only min set: age must be >= min
      if (cls.age_min != null && cls.age_max == null) return ageValue >= cls.age_min;
      // Only max set: age must be <= max
      if (cls.age_min == null && cls.age_max != null) return ageValue <= cls.age_max;
      // Both set: age must be within range
      return ageValue >= cls.age_min! && ageValue <= cls.age_max!;
    });
  }

  const hasActiveFilters = !!searchQuery || (ageValue > 0 && !isNaN(ageValue));

  // Map filtered enrollments to per-student calendar entries
  const calendarEnrollments = useMemo<EnrollmentForCalendar[]>(() => {
    return filteredEnrollments
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
  }, [filteredEnrollments]);

  return (
    <div className="space-y-4">
      {/* Sticky unified filter bar */}
      <div className="bg-background sticky top-16 z-20 pb-2 pt-2">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-filter-bar px-3 py-2.5">
          {/* Search input */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by class name, teacher, day..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 bg-background pl-9 pr-9 shadow-sm"
              data-testid="enrollment-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Result count */}
          {hasActiveFilters && (
            <span className="text-muted-foreground shrink-0 text-sm">
              {filteredEnrollments.length} {filteredEnrollments.length === 1 ? 'enrollment' : 'enrollments'} found
            </span>
          )}

          {/* Divider */}
          <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />

          {/* Age filter — pill stepper */}
          <div className="flex items-center gap-3">
            <Label htmlFor="enrollment-age-input" className="shrink-0 cursor-pointer text-sm whitespace-nowrap text-muted-foreground">
              Child&apos;s age
            </Label>
            <div className="inline-flex items-center rounded-md border border-border/60 bg-background">
              <button
                type="button"
                data-testid="enrollment-age-decrement"
                aria-label="Decrease age"
                onClick={() => {
                  const current = parseInt(childAge, 10) || 0;
                  if (current > 0) {
                    setChildAge(String(current - 1));
                  }
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                disabled={childAge === '0'}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex h-10 min-w-[3.5rem] items-center justify-center border-x border-border/60 px-2 text-sm font-medium tabular-nums">
                {childAge} yrs
              </span>
              <button
                type="button"
                data-testid="enrollment-age-increment"
                aria-label="Increase age"
                onClick={() => {
                  const current = parseInt(childAge, 10) || 0;
                  if (current < 18) {
                    setChildAge(String(current + 1));
                  }
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                disabled={childAge === '18'}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {/* Visually hidden input for test compatibility */}
            <input
              id="enrollment-age-input"
              type="text"
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              data-testid="enrollment-age-input"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          {/* View toggle: Cards | Calendar */}
          <ViewToggle calendarView={calendarView} onToggle={setCalendarView} />
        </div>
      </div>

      {filteredEnrollments.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No enrollments match your filters. Try adjusting your search or age.
        </p>
      ) : calendarView ? (
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
              enrollments={filteredEnrollments}
              onCancel={handleCancel}
              showStudent={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
