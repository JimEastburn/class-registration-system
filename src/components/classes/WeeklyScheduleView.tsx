'use client';

import { useState, useEffect } from 'react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfDay,
  endOfDay,
  parseISO,
} from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getStudentSchedule, ScheduleEvent } from '@/lib/actions/student';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VALID_BLOCKS } from '@/lib/logic/scheduling';

interface WeeklyScheduleViewProps {
  studentId: string;
}

export function WeeklyScheduleView({ studentId }: WeeklyScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const BLOCKS = VALID_BLOCKS;

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      setLoading(true);
      let start: Date, end: Date;

      if (view === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
      }

      const { data, error } = await getStudentSchedule(studentId, start, end);
      if (!cancelled && !error && data) {
        setEvents(data);
      }
      if (!cancelled) {
        setLoading(false);
      }
    }

    void fetchSchedule();

    return () => {
      cancelled = true;
    };
  }, [studentId, currentDate, view]);

  const handlePrevious = () => {
    setCurrentDate((prev) =>
      view === 'week' ? subWeeks(prev, 1) : addDays(prev, -1)
    );
  };

  const handleNext = () => {
    setCurrentDate((prev) =>
      view === 'week' ? addWeeks(prev, 1) : addDays(prev, 1)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate grid columns
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days =
    view === 'week'
      ? eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
      : [currentDate];

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="bg-background ml-4 flex items-center rounded-md border shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="px-3" onClick={handleToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {loading && (
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          )}
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v: string) => v && setView(v as 'week' | 'day')}
          >
            <ToggleGroupItem value="week">Week</ToggleGroupItem>
            <ToggleGroupItem value="day">Day</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-background relative min-h-[600px] flex-1 overflow-auto rounded-md border">
        {/* Header Row */}
        <div className="bg-background sticky top-0 z-10 flex border-b">
          <div className="bg-muted/50 text-muted-foreground flex w-24 flex-none items-center justify-center border-r p-2 text-sm font-medium">
            Block
          </div>
          {days.map((day) => (
            <div
              key={day.toString()}
              className={cn(
                'min-w-[120px] flex-1 border-r py-2 text-center last:border-r-0',
                isSameDay(day, new Date()) && 'bg-accent/50'
              )}
            >
              <div className="text-muted-foreground text-sm font-medium">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xl font-bold',
                  isSameDay(day, new Date()) &&
                    'bg-primary text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex flex-col">
          {BLOCKS.map((block) => (
            <div
              key={block}
              className="flex min-h-[100px] border-b"
            >
              {/* Block Label Sidebar */}
              <div className="bg-muted/10 text-muted-foreground flex w-24 flex-none items-center justify-center border-r p-2 text-sm font-medium">
                {block}
              </div>

              {/* Day Cells */}
              {days.map((day) => {
                const dayEvents = events.filter(
                  (e) => isSameDay(parseISO(e.date), day) && e.block === block
                );

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      'min-w-[120px] flex-1 border-r p-2 last:border-r-0',
                      isSameDay(day, new Date()) && 'bg-accent/5'
                    )}
                  >
                    {dayEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/student/classes/${event.class_id}`}
                        className="bg-primary/10 border-primary hover:bg-primary/20 mb-2 block cursor-pointer overflow-hidden rounded-md border-l-4 p-2 text-xs transition-colors"
                        title={`${event.title} (${event.location})`}
                      >
                        <div className="text-primary font-semibold">
                          {event.title}
                        </div>
                        <div className="text-muted-foreground line-clamp-1">
                          {block}
                        </div>
                        {event.location && (
                          <div className="text-muted-foreground line-clamp-1 italic">
                            {event.location}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
