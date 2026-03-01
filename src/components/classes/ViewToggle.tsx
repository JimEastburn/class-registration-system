'use client';

import { Calendar, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
  calendarView: boolean;
  onToggle: (calendar: boolean) => void;
}

export function ViewToggle({ calendarView, onToggle }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-muted/70 p-1" role="group" aria-label="View mode">
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-pressed={!calendarView}
        data-testid="view-toggle-cards"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-sm font-medium transition-all ${
          !calendarView
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onToggle(true)}
        aria-pressed={calendarView}
        data-testid="view-toggle-calendar"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-sm font-medium transition-all ${
          calendarView
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </button>
    </div>
  );
}
