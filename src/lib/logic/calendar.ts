
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ScheduleConfig } from '@/types';

export interface CalendarEventInsert {
  class_id: string;
  date: string; // ISO date
  block: string;
  location?: string | null;
  description?: string | null;
}

/**
 * Generates calendar events for a class based on its schedule configuration
 */
export function generateClassEvents(
  classId: string,
  config: ScheduleConfig,
  details?: { location?: string | null; description?: string | null }
): CalendarEventInsert[] {
  const events: CalendarEventInsert[] = [];

  if (!config.startDate || !config.endDate || !config.day || !config.block) {
    return events;
  }

  const start = parseISO(config.startDate);
  const end = parseISO(config.endDate);
  
  if (start > end) return events;

  const allDays = eachDayOfInterval({ start, end });
  const targetDay = config.day; // e.g. "Monday" or "Tuesday/Thursday"

  for (const day of allDays) {
    const dayName = format(day, 'EEEE');
    
    // Check if the current day matches the configured day(s)
    // Supports "Monday", "Tuesday", etc. AND "Tuesday/Thursday" type strings
    if (targetDay.includes(dayName)) {
       events.push({
         class_id: classId,
         date: format(day, 'yyyy-MM-dd'),
         block: config.block,
         location: details?.location || null,
         description: details?.description || null,
       });
    }
  }

  return events;
}
