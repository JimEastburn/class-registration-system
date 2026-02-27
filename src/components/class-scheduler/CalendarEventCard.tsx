import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

export interface CalendarUIEvent {
  id: string;
  classId?: string; // Original class ID
  title: string;
  block?: string;
  date?: Date;
  start?: Date;
  end?: Date;
  teacherName: string;
  location?: string;
  isConflict?: boolean;
  [key: string]: unknown; // Allow compatibility with dnd-kit data
}

interface CalendarEventCardProps {
  event: CalendarUIEvent;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
  isMonthView?: boolean;
  isConflict?: boolean;
}

export function CalendarEventCard({
  event,
  style,
  onClick,
  className,
  isMonthView = false,
  isConflict = false,
}: CalendarEventCardProps) {
  if (isMonthView) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'cursor-pointer truncate rounded border-l-2 px-1.5 py-0.5 text-xs transition-colors',
          isConflict || event.isConflict
            ? 'border-red-500 bg-red-100 text-red-800 hover:bg-red-200'
            : 'border-blue-500 bg-blue-100 text-blue-800 hover:bg-blue-200',
          className
        )}
        title={`${event.title} - ${event.teacherName}${isConflict || event.isConflict ? ' (CONFLICT)' : ''}`}
      >
        <span className="mr-1 font-medium">
          {event.block || (event.start ? format(event.start, 'h:mm a') : '')}
        </span>
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-md border-l-4 p-2 text-xs transition-colors',
        isConflict || event.isConflict
          ? 'border-red-500 bg-red-100 hover:bg-red-200'
          : 'border-blue-500 bg-blue-100 hover:bg-blue-200',
        className
      )}
      style={style}
      title={`${event.title} - ${event.teacherName}${isConflict || event.isConflict ? ' (CONFLICT)' : ''}`}
    >
      <div
        className={cn(
          'truncate font-semibold',
          isConflict || event.isConflict ? 'text-red-700' : 'text-blue-700'
        )}
      >
        {event.title}
      </div>
      <div
        className={cn(
          'truncate',
          isConflict || event.isConflict ? 'text-red-600' : 'text-blue-600'
        )}
      >
        {event.teacherName}
      </div>
      <div
        className={cn(
          'mt-1 line-clamp-1 flex justify-between',
          isConflict || event.isConflict ? 'text-red-500' : 'text-blue-500'
        )}
      >
        <span>
          {event.block || (event.start ? format(event.start, 'h:mm a') : '')}
        </span>
        {event.location && (
          <span className="ml-1 truncate italic">{event.location}</span>
        )}
      </div>
    </div>
  );
}
