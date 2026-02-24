import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

import type { Tables } from '@/types/database';
import type { Class, ScheduleConfig } from '@/types';

export interface UpcomingClass {
  className: string;
  date: Date;
  block: string;
  location: string;
}

/**
 * Shape returned by the Supabase join query:
 *   calendar_events + class:classes(name, location, block, schedule_config)
 *
 * Uses generated DB types for accurate nullability on event fields,
 * and project-level Class type for the joined relation.
 */
export type CalendarEventRow = Pick<
  Tables<'calendar_events'>,
  'date' | 'block' | 'location'
> & {
  class?: Pick<Class, 'name' | 'location' | 'block'> & {
    schedule_config?: ScheduleConfig | null;
  };
};

/**
 * Resolves the display block name by falling through:
 *  event.block → class.block → schedule_config.block → 'TBA'
 */
export function resolveBlockName(event: CalendarEventRow): string {
  return (
    event.block ||
    event.class?.block ||
    event.class?.schedule_config?.block ||
    'TBA'
  );
}

/**
 * Maps a raw Supabase calendar event row into an UpcomingClass.
 */
export function toUpcomingClass(event: CalendarEventRow): UpcomingClass {
  return {
    className: event.class?.name || 'Untitled Class',
    date: new Date((event.date ?? '') + 'T00:00:00'),
    block: resolveBlockName(event),
    location: event.location || event.class?.location || 'TBD',
  };
}

/**
 * Sorts upcoming classes by date (ascending), then by block name.
 */
export function sortUpcomingClasses(classes: UpcomingClass[]): UpcomingClass[] {
  return [...classes].sort((a, b) => {
    const dateDiff = a.date.getTime() - b.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.block.localeCompare(b.block);
  });
}

export async function NextClassCard({ studentId }: { studentId: string }) {
  const supabase = await createClient();

  // 1. Get enrolled class IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'confirmed');

  if (!enrollments || enrollments.length === 0) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You are not enrolled in any classes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const classIds = enrollments.map((e) => e.class_id);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 2. Get the next event for EACH enrolled class
  const upcoming: UpcomingClass[] = [];

  for (const classId of classIds) {
    const { data: nextEvent } = await supabase
      .from('calendar_events')
      .select(
        `
          date,
          block,
          location,
          class:classes (
              name,
              location,
              block,
              schedule_config
          )
      `
      )
      .eq('class_id', classId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (nextEvent) {
      upcoming.push(toUpcomingClass(nextEvent as unknown as CalendarEventRow));
    }
  }

  const sorted = sortUpcomingClasses(upcoming);

  if (sorted.length === 0) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No upcoming classes scheduled.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sorted.map((cls, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 items-center gap-2 md:grid-cols-[auto_1fr] ${
                i < sorted.length - 1 ? 'border-b pb-4' : ''
              }`}
            >
              <div className="flex flex-col gap-1 text-sm md:min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Clock className="text-primary h-4 w-4" />
                  <span>{cls.block}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-primary h-4 w-4" />
                  <span>{cls.location}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold">{cls.className}</h3>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{format(cls.date, 'EEEE, MMMM d')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
