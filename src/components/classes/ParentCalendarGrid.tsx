'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleConfig } from '@/types';
import { CalendarEventCard, type CalendarUIEvent } from '@/components/class-scheduler/CalendarEventCard';

// Same matrix structure as MasterCalendarGrid
const COLUMNS = ['Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4'];
const ROWS = ['Tuesday/Thursday', 'Tuesday', 'Thursday', 'Wednesday'];

// All collapsible columns: Day + the 5 block columns
const ALL_COLUMNS = ['Day', ...COLUMNS];

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

/** Build gridTemplateColumns string based on which columns are collapsed */
function buildGridTemplate(collapsed: Record<string, boolean>): string {
  const dayCol = collapsed['Day'] ? '90px' : '180px';
  const blockCols = COLUMNS.map((col) => {
    if (col === 'Lunch') return collapsed[col] ? '50px' : '100px';
    return collapsed[col] ? '0.5fr' : '1fr';
  });
  return [dayCol, ...blockCols].join(' ');
}

export function ParentCalendarGrid({ classes }: ParentCalendarGridProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleColumn = useCallback((col: string) => {
    setCollapsed((prev) => ({ ...prev, [col]: !prev[col] }));
  }, []);

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

  const gridTemplate = buildGridTemplate(collapsed);

  return (
    <div className="overflow-x-auto">
      <div
        className="bg-background min-w-[1200px] overflow-hidden rounded-md border-2 border-border/90 transition-all duration-300"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
        }}
      >
        {/* Header Row */}
        {ALL_COLUMNS.map((col, i) => {
          const isLast = i === ALL_COLUMNS.length - 1;
          const isCollapsed = !!collapsed[col];
          const isLunch = col === 'Lunch';
          const isDay = col === 'Day';

          return (
            <div
              key={col}
              className={cn(
                'bg-muted/40 border-b-2 border-border/90 p-2 text-sm font-semibold transition-all duration-300',
                !isLast && 'border-r-2 border-border/90',
                isLunch && 'bg-muted/20 text-muted-foreground',
                isDay ? 'text-left' : 'text-center'
              )}
            >
              <div className={cn(
                'flex items-center gap-1',
                isDay ? 'justify-between' : 'justify-center'
              )}>
                {!isCollapsed && <span className="truncate">{col}</span>}
                <button
                  type="button"
                  onClick={() => toggleColumn(col)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex shrink-0 cursor-pointer items-center justify-center rounded p-0.5 transition-colors"
                  title={isCollapsed ? `Expand ${col}` : `Collapse ${col}`}
                  aria-label={isCollapsed ? `Expand ${col} column` : `Collapse ${col} column`}
                >
                  {isCollapsed ? (
                    <ChevronsRight className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Rows */}
        {ROWS.map((pattern, rowIdx) => {
          const isLastRow = rowIdx === ROWS.length - 1;
          return (
            <React.Fragment key={pattern}>
              {/* Row Header (Day column) */}
              <div
                className={cn(
                  'bg-muted/10 flex items-center border-r-2 border-border/90 p-3 text-sm font-medium transition-all duration-300',
                  !isLastRow && 'border-b-2 border-border/90',
                  collapsed['Day'] && 'overflow-hidden'
                )}
              >
                {collapsed['Day'] ? (
                  <span className="text-muted-foreground truncate text-xs" title={DAY_LABELS[pattern] ?? pattern}>
                    {(DAY_LABELS[pattern] ?? pattern).slice(0, 3)}
                  </span>
                ) : (
                  DAY_LABELS[pattern] ?? pattern
                )}
              </div>

              {/* Grid Cells */}
              {COLUMNS.map((col, colIdx) => {
                const isLunch = col === 'Lunch';
                const isLastCol = colIdx === COLUMNS.length - 1;
                const isCollapsed = !!collapsed[col];

                return (
                  <div
                    key={`${pattern}::${col}`}
                    className={cn(
                      'relative overflow-hidden transition-all duration-300',
                      !isLastCol && 'border-r-2 border-border/90',
                      !isLastRow && 'border-b-2 border-border/90',
                      isLunch && 'bg-muted/20'
                    )}
                  >
                    {isCollapsed ? (
                      <div className="text-muted-foreground/40 flex h-full min-h-[140px] items-center justify-center">
                        <span className="text-xs">⋮</span>
                      </div>
                    ) : isLunch ? (
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
