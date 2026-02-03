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
  isConflict = false
}: CalendarEventCardProps) {
  
  if (isMonthView) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "text-xs truncate rounded px-1.5 py-0.5 border-l-2 cursor-pointer transition-colors",
          (isConflict || event.isConflict)
            ? "bg-red-100 text-red-800 border-red-500 hover:bg-red-200" 
            : "bg-blue-100 text-blue-800 border-blue-500 hover:bg-blue-200",
          className
        )}
        title={`${event.title} - ${event.teacherName}${isConflict || event.isConflict ? ' (CONFLICT)' : ''}`}
      >
        <span className="font-medium mr-1">{event.block || (event.start ? format(event.start, 'h:mm a') : '')}</span>
        {event.title}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute left-1 right-1 rounded-md border-l-4 p-2 text-xs overflow-hidden transition-colors cursor-pointer group z-10 flex flex-col",
        (isConflict || event.isConflict)
          ? "bg-red-100 border-red-500 hover:bg-red-200"
          : "bg-blue-100 border-blue-500 hover:bg-blue-200",
        className
      )}
      style={style}
      title={`${event.title} - ${event.teacherName}${isConflict || event.isConflict ? ' (CONFLICT)' : ''}`}
    >
      <div className={cn("font-semibold truncate", (isConflict || event.isConflict) ? "text-red-700" : "text-blue-700")}>{event.title}</div>
      <div className={cn("truncate", (isConflict || event.isConflict) ? "text-red-600" : "text-blue-600")}>{event.teacherName}</div>
      <div className={cn("line-clamp-1 flex justify-between mt-1", (isConflict || event.isConflict) ? "text-red-500" : "text-blue-500")}>
        <span>{event.block || (event.start ? format(event.start, 'h:mm a') : '')}</span>
        {event.location && <span className="italic truncate ml-1">{event.location}</span>}
      </div>
    </div>
  );
}
