'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ScheduleConfig } from '@/types';
import {
  CalendarEventCard,
  type CalendarUIEvent,
  type CalendarColorScheme,
} from '@/components/class-scheduler/CalendarEventCard';

const COLUMNS = ['Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4'];
const ROWS = ['Tuesday/Thursday', 'Tuesday', 'Thursday', 'Wednesday'];

const DAY_LABELS: Record<string, string> = {
  'Tuesday/Thursday': 'Tuesday/Thursday',
  Tuesday: 'Tuesday only',
  Thursday: 'Thursday only',
  Wednesday: 'Wednesday only',
};

// Curated color palettes for up to 8 children (visually distinct)
const CHILD_COLOR_SCHEMES: CalendarColorScheme[] = [
  { border: 'border-blue-500',   bg: 'bg-blue-100',   hover: 'hover:bg-blue-200',   title: 'text-blue-700',   text: 'text-blue-600',   accent: 'text-blue-500' },
  { border: 'border-emerald-500', bg: 'bg-emerald-100', hover: 'hover:bg-emerald-200', title: 'text-emerald-700', text: 'text-emerald-600', accent: 'text-emerald-500' },
  { border: 'border-violet-500',  bg: 'bg-violet-100',  hover: 'hover:bg-violet-200',  title: 'text-violet-700',  text: 'text-violet-600',  accent: 'text-violet-500' },
  { border: 'border-amber-500',   bg: 'bg-amber-100',   hover: 'hover:bg-amber-200',   title: 'text-amber-700',   text: 'text-amber-600',   accent: 'text-amber-500' },
  { border: 'border-rose-500',    bg: 'bg-rose-100',    hover: 'hover:bg-rose-200',    title: 'text-rose-700',    text: 'text-rose-600',    accent: 'text-rose-500' },
  { border: 'border-cyan-500',    bg: 'bg-cyan-100',    hover: 'hover:bg-cyan-200',    title: 'text-cyan-700',    text: 'text-cyan-600',    accent: 'text-cyan-500' },
  { border: 'border-orange-500',  bg: 'bg-orange-100',  hover: 'hover:bg-orange-200',  title: 'text-orange-700',  text: 'text-orange-600',  accent: 'text-orange-500' },
  { border: 'border-pink-500',    bg: 'bg-pink-100',    hover: 'hover:bg-pink-200',    title: 'text-pink-700',    text: 'text-pink-600',    accent: 'text-pink-500' },
];

export interface EnrollmentForCalendar {
  classId: string;
  className: string;
  location: string | null;
  scheduleConfig: ScheduleConfig | null;
  teacherName: string;
  studentId: string;
  studentName: string;
}

interface EnrollmentCalendarGridProps {
  enrollments: EnrollmentForCalendar[];
}

type CalendarUIEventWithConfig = CalendarUIEvent & { rawConfig: ScheduleConfig };

export function EnrollmentCalendarGrid({ enrollments }: EnrollmentCalendarGridProps) {
  const router = useRouter();

  // Build student → color mapping (stable order by first appearance)
  const studentColorMap = useMemo(() => {
    const map = new Map<string, CalendarColorScheme>();
    const seen: string[] = [];

    for (const e of enrollments) {
      if (!seen.includes(e.studentId)) {
        seen.push(e.studentId);
        map.set(e.studentId, CHILD_COLOR_SCHEMES[seen.length - 1] ?? CHILD_COLOR_SCHEMES[0]);
      }
    }

    return map;
  }, [enrollments]);

  // Build legend entries
  const legend = useMemo(() => {
    const entries: { studentId: string; studentName: string; colorScheme: CalendarColorScheme }[] = [];
    const seen = new Set<string>();

    for (const e of enrollments) {
      if (!seen.has(e.studentId)) {
        seen.add(e.studentId);
        entries.push({
          studentId: e.studentId,
          studentName: e.studentName,
          colorScheme: studentColorMap.get(e.studentId) ?? CHILD_COLOR_SCHEMES[0],
        });
      }
    }

    return entries;
  }, [enrollments, studentColorMap]);

  // Map enrollments into CalendarUIEvents
  const events = useMemo(() => {
    const mapped: CalendarUIEventWithConfig[] = [];

    enrollments.forEach((e) => {
      if (!e.scheduleConfig) return;
      const config = e.scheduleConfig;
      if (!config.day || !config.block) return;

      mapped.push({
        id: `${e.classId}-${e.studentId}`,
        classId: e.classId,
        title: e.className,
        subtitle: e.studentName,
        block: config.block,
        teacherName: e.teacherName,
        location: e.location || undefined,
        colorScheme: studentColorMap.get(e.studentId),
        rawConfig: config,
      });
    });

    return mapped;
  }, [enrollments, studentColorMap]);

  return (
    <div className="space-y-4">
      {/* Color Legend */}
      {legend.length > 1 && (
        <div className="flex flex-wrap items-center gap-4">
          {legend.map((entry) => (
            <div key={entry.studentId} className="flex items-center gap-2">
              <div
                className={cn(
                  'h-3 w-3 rounded-full',
                  entry.colorScheme.bg,
                  entry.colorScheme.border.replace('border-', 'ring-1 ring-')
                )}
                style={{
                  backgroundColor: undefined, // let Tailwind handle it
                }}
              />
              <span className="text-sm font-medium">{entry.studentName}</span>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
