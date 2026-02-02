'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getStudentSchedule, ScheduleEvent } from '@/lib/actions/student';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface WeeklyScheduleViewProps {
  studentId: string;
}

export function WeeklyScheduleView({ studentId }: WeeklyScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Define Blocks
  const BLOCKS = ['Block 1', 'Block 2', 'Block 3', 'Block 4'];

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    let start: Date, end: Date;

    if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    const { data, error } = await getStudentSchedule(studentId, start, end);
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  }, [studentId, currentDate, view]);

  useEffect(() => {
    void fetchSchedule();
  }, [fetchSchedule]);

  const handlePrevious = () => {
    setCurrentDate((prev) => (view === 'week' ? subWeeks(prev, 1) : addDays(prev, -1)));
  };

  const handleNext = () => {
    setCurrentDate((prev) => (view === 'week' ? addWeeks(prev, 1) : addDays(prev, 1)));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate grid columns
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = view === 'week' 
    ? eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
    : [currentDate];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
            </h2>
             <div className="flex items-center rounded-md border bg-background shadow-sm ml-4">
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
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <ToggleGroup type="single" value={view} onValueChange={(v: string) => v && setView(v as 'week' | 'day')}>
                <ToggleGroupItem value="week">Week</ToggleGroupItem>
                <ToggleGroupItem value="day">Day</ToggleGroupItem>
            </ToggleGroup>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 rounded-md border bg-background overflow-auto relative min-h-[600px]">
         {/* Header Row */}
         <div className="flex border-b sticky top-0 bg-background z-10">
             <div className="w-24 flex-none border-r bg-muted/50 p-2 text-sm font-medium text-muted-foreground flex items-center justify-center">Block</div>
             {days.map((day) => (
                 <div key={day.toString()} className={cn(
                     "flex-1 py-2 text-center border-r last:border-r-0 min-w-[120px]",
                     isSameDay(day, new Date()) && "bg-accent/50"
                 )}>
                     <div className="text-sm font-medium text-muted-foreground">{format(day, 'EEE')}</div>
                     <div className={cn(
                         "text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1",
                         isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                     )}>
                         {format(day, 'd')}
                     </div>
                 </div>
             ))}
         </div>

         {/* Body */}
         <div className="flex flex-col">
            {BLOCKS.map((block) => (
                <div key={block} className="flex border-b last:border-b-0 min-h-[100px]">
                    {/* Block Label Sidebar */}
                    <div className="w-24 flex-none border-r bg-muted/10 p-2 text-sm font-medium text-muted-foreground flex items-center justify-center">
                        {block}
                    </div>

                    {/* Day Cells */}
                    {days.map((day) => {
                        const dayEvents = events.filter(e => 
                            isSameDay(new Date(e.date), day) && e.block === block
                        );

                        return (
                            <div key={day.toString()} className={cn(
                                "flex-1 border-r last:border-r-0 p-2 min-w-[120px]",
                                isSameDay(day, new Date()) && "bg-accent/5"
                            )}>
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        className="rounded-md bg-primary/10 border-l-4 border-primary p-2 text-xs overflow-hidden hover:bg-primary/20 transition-colors cursor-pointer mb-2"
                                        title={`${event.title} (${event.location})`}
                                    >
                                        <div className="font-semibold text-primary">{event.title}</div>
                                        <div className="text-muted-foreground line-clamp-1">{block}</div>
                                        {event.location && <div className="text-muted-foreground line-clamp-1 italic">{event.location}</div>}
                                    </div>
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
