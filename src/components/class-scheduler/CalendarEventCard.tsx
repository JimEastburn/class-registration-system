import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

export interface CalendarColorScheme {
  border: string;    // e.g. 'border-purple-500'
  bg: string;        // e.g. 'bg-purple-100'
  hover: string;     // e.g. 'hover:bg-purple-200'
  title: string;     // e.g. 'text-purple-700'
  text: string;      // e.g. 'text-purple-600'
  accent: string;    // e.g. 'text-purple-500'
}

export interface CalendarUIEvent {
  id: string;
  classId?: string; // Original class ID
  title: string;
  subtitle?: string;
  block?: string;
  date?: Date;
  start?: Date;
  end?: Date;
  teacherName: string;
  location?: string;
  isConflict?: boolean;
  colorScheme?: CalendarColorScheme;
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
    const borderColor = event.colorScheme?.border ?? (isConflict || event.isConflict ? 'border-red-500' : 'border-blue-500');
    const bgColor = event.colorScheme?.bg ?? (isConflict || event.isConflict ? 'bg-red-100' : 'bg-blue-100');
    const hoverColor = event.colorScheme?.hover ?? (isConflict || event.isConflict ? 'hover:bg-red-200' : 'hover:bg-blue-200');
    const textColor = event.colorScheme?.title ?? (isConflict || event.isConflict ? 'text-red-800' : 'text-blue-800');

    return (
      <div
        onClick={onClick}
        className={cn(
          'cursor-pointer truncate rounded border-l-2 px-1.5 py-0.5 text-xs transition-colors',
          borderColor,
          bgColor,
          textColor,
          hoverColor,
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

  const borderColor = event.colorScheme?.border ?? (isConflict || event.isConflict ? 'border-red-500' : 'border-blue-500');
  const bgColor = event.colorScheme?.bg ?? (isConflict || event.isConflict ? 'bg-red-100' : 'bg-blue-100');
  const hoverColor = event.colorScheme?.hover ?? (isConflict || event.isConflict ? 'hover:bg-red-200' : 'hover:bg-blue-200');
  const titleColor = event.colorScheme?.title ?? (isConflict || event.isConflict ? 'text-red-700' : 'text-blue-700');
  const textColor = event.colorScheme?.text ?? (isConflict || event.isConflict ? 'text-red-600' : 'text-blue-600');
  const accentColor = event.colorScheme?.accent ?? (isConflict || event.isConflict ? 'text-red-500' : 'text-blue-500');

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-md border-l-4 p-2 text-xs transition-colors',
        borderColor,
        bgColor,
        hoverColor,
        className
      )}
      style={style}
      title={`${event.title} - ${event.teacherName}${isConflict || event.isConflict ? ' (CONFLICT)' : ''}`}
    >
      <div className={cn('truncate font-semibold', titleColor)}>
        {event.title}
      </div>
      {event.subtitle && (
        <div className={cn('truncate font-medium', textColor)}>
          {event.subtitle}
        </div>
      )}
      <div className={cn('truncate', textColor)}>
        {event.teacherName}
      </div>
      <div
        className={cn(
          'mt-1 line-clamp-1 flex justify-between',
          accentColor
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
