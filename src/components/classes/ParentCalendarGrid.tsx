'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ScheduleConfig } from '@/types';
import { CalendarEventCard, type CalendarUIEvent } from '@/components/class-scheduler/CalendarEventCard';

// Same matrix structure as MasterCalendarGrid
const COLUMNS = ['Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4'];
const ROWS = ['Tuesday/Thursday', 'Tuesday', 'Thursday', 'Wednesday'];

const DAY_LABELS: Record<string, string> = {
  'Tuesday/Thursday': 'Tuesday/Thursday',
  Tuesday: 'Tuesday only',
  Thursday: 'Thursday only',
  Wednesday: 'Wednesday only',
};

interface ClassForCalendar {
  id: string;
  name: string;
  location: string | null;
  schedule_config: ScheduleConfig | null;
  teacher: {
    id?: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ParentCalendarGridProps {
  classes: ClassForCalendar[];
}

type CalendarUIEventWithConfig = CalendarUIEvent & { rawConfig: ScheduleConfig };

export function ParentCalendarGrid({ classes }: ParentCalendarGridProps) {
  const router = useRouter();

  // Map classes into CalendarUIEvents
  const events = useMemo(() => {
    const mapped: CalendarUIEventWithConfig[] = [];

    classes.forEach((cls) => {
      if (!cls.schedule_config) return;
      const config = cls.schedule_config;
      if (!config.day || !config.block) return;

      const teacherName = cls.teacher
        ? `${cls.teacher.first_name || ''} ${cls.teacher.last_name || ''}`.trim()
        : 'TBD';

      mapped.push({
        id: cls.id,
        classId: cls.id,
        title: cls.name,
        block: config.block,
        teacherName,
        location: cls.location || undefined,
        rawConfig: config,
      });
    });

    return mapped;
  }, [classes]);

  return (
    <div className="overflow-x-auto">
      <div
        className="bg-background min-w-[1000px] overflow-hidden rounded-md border-2 border-border/90"
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr 1fr 100px 1fr 1fr',
        }}
      >
        {/* Header Row */}
        <div className="bg-muted/40 border-b-2 border-r-2 border-border/90 p-3 text-sm font-semibold">
          Day
        </div>
        {COLUMNS.map((col, i) => (
          <div
            key={col}
            className={cn(
              'bg-muted/40 border-b-2 border-border/90 p-3 text-center text-sm font-semibold',
              i < COLUMNS.length - 1 && 'border-r-2 border-border/90',
              col === 'Lunch' && 'bg-muted/20 text-muted-foreground'
            )}
          >
            {col}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((pattern, rowIdx) => {
          const isLastRow = rowIdx === ROWS.length - 1;
          return (
            <React.Fragment key={pattern}>
              {/* Row Header */}
              <div
                className={cn(
                  'bg-muted/10 flex items-center border-r-2 border-border/90 p-3 text-sm font-medium',
                  !isLastRow && 'border-b-2 border-border/90'
                )}
              >
                {DAY_LABELS[pattern] ?? pattern}
              </div>

              {/* Grid Cells */}
              {COLUMNS.map((col, colIdx) => {
                const isLunch = col === 'Lunch';
                const isLastCol = colIdx === COLUMNS.length - 1;

                return (
                  <div
                    key={`${pattern}::${col}`}
                    className={cn(
                      'relative',
                      !isLastCol && 'border-r-2 border-border/90',
                      !isLastRow && 'border-b-2 border-border/90',
                      isLunch && 'bg-muted/20'
                    )}
                  >
                    {isLunch ? (
                      <div className="text-muted-foreground flex h-full min-h-[140px] w-full items-center justify-center text-xs">
                        LUNCH
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[140px] flex-col gap-2 p-2">
                        {events
                          .filter(
                            (e) =>
                              e.rawConfig.day === pattern &&
                              e.rawConfig.block === col
                          )
                          .map((event) => (
                            <CalendarEventCard
                              key={event.id}
                              event={event}
                              isMonthView={false}
                              onClick={() => {
                                router.push(`/parent/browse/${event.classId}`);
                              }}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
