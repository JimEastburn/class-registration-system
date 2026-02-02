'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Filter } from 'lucide-react';
import { getClassesForScheduler, schedulerUpdateClass } from '@/lib/actions/scheduler';
import { cn } from '@/lib/utils';
import { ClassWithTeacher, ScheduleConfig, Class } from '@/types';
import { CalendarEventCard, CalendarUIEvent } from './CalendarEventCard';
import { detectBatchConflicts } from '@/lib/logic/scheduling';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, MouseSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import { DraggableEventWrapper } from './DraggableEventWrapper';
import { DroppableBlock } from './DroppableBlock';

type CalculatorView = 'week' | 'month';

const BLOCKS = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'];

export function MasterCalendarGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalculatorView>('week');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [activeDragEvent, setActiveDragEvent] = useState<CalendarUIEvent | null>(null);
  
  // Filter states
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
        activationConstraint: {
            distance: 10,
        },
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const eventData = active.data.current as CalendarUIEvent;
    if (eventData) {
        setActiveDragEvent(eventData);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragEvent(null);

    if (!over) return;

    // Parse over.id: "Dayname-BlockName" e.g "Monday-Block 1"
    // Since IDs can contain dashes, we need to be careful. But Block names are fixed.
    // Format is `${dayName}-${block}`.
    // We can assume format is reliable.
    const overId = over.id as string;
    // Find the last dash to split block? No, block can have spaces "Block 1".
    // Day names like "Monday" don't have dashes.
    // So split by first dash is safe? "Monday-Block 1".
    const [dayName, ...blockParts] = overId.split('-');
    const blockName = blockParts.join('-');

    if (!dayName || !blockName) return;

    // Parse active.data
    const eventData = active.data.current as CalendarUIEvent & { rawConfig: ScheduleConfig };
    if (!eventData || !eventData.classId) return;

    // Check if changed
    if (dayName === eventData.rawConfig.day && blockName === eventData.rawConfig.block) {
        return; 
    }

    console.log(`Moving class ${eventData.classId} to ${dayName} ${blockName}`);

    // Optimistic Update
    const oldClasses = [...classes];
    
    // We need to update the local state to reflect the move immediately
    setClasses(prev => prev.map(cls => {
        if (cls.id === eventData.classId) {
            // Create a new config with the updated day/block
            const newConfig: ScheduleConfig = {
                ...cls.schedule_config as ScheduleConfig,
                day: dayName,
                block: blockName
            };
            return {
                ...cls,
                schedule_config: newConfig
            };
        }
        return cls;
    }));

    // Server Action
    // We must pass the FULL config because schedulerUpdateClass merges using spread, 
    // effectively replacing the schedule_config object if we pass it.
    // Wait, updateClass merges top-level fields. schedule_config is a field.
    // So yes, we must provide full schedule_config.
    const newConfig: ScheduleConfig = {
        ...eventData.rawConfig,
        day: dayName,
        block: blockName
    };

    const result = await schedulerUpdateClass(eventData.classId, {
        schedule_config: newConfig
    });

    if (!result.success) {
        // Rollback
        setClasses(oldClasses);
        console.error("Move failed:", result.error);
        alert(`Failed to move class: ${result.error}`);
    }
  };

  // fetch classes once on mount
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      const result = await getClassesForScheduler(1, 100);
      if (result.success && result.data) {
        setClasses(result.data.classes as unknown as ClassWithTeacher[]);
      }
      setLoading(false);
    };
    void fetchClasses();
  }, []);

  const uniqueTeachers = useMemo(() => {
    const teachers = new Set<string>();
    classes.forEach(cls => {
      if (cls.teacher) {
        teachers.add(`${cls.teacher.first_name} ${cls.teacher.last_name}`);
      }
    });
    return Array.from(teachers).sort();
  }, [classes]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    classes.forEach(cls => {
      if (cls.location) {
        locations.add(cls.location);
      }
    });
    return Array.from(locations).sort();
  }, [classes]);

  const events = useMemo(() => {
    if (classes.length === 0) return [];

    let rangeStart: Date;
    let rangeEnd: Date;

    if (view === 'week') {
      rangeStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      rangeEnd = addDays(rangeStart, 6);
    } else {
      rangeStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }); 
      rangeEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }); 
    }

    const mappedEvents: (CalendarUIEvent & { rawConfig: ScheduleConfig })[] = [];
    const daysInRange = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    // Detect conflicts for ALL classes (ignore filters for conflict detection to be accurate)
    const conflictingClassIds = detectBatchConflicts(classes as unknown as Class[]);

    classes.forEach((cls) => {
      if (!cls.schedule_config || cls.status !== 'published') return;
      
      const config = cls.schedule_config as ScheduleConfig;
      if (!config.day || !config.block) return;

      // Apply Filters
      const teacherName = cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : 'Unknown Teacher';
      if (selectedTeacher !== 'all' && teacherName !== selectedTeacher) return;
      if (selectedLocation !== 'all' && cls.location !== selectedLocation) return;

      // Find all matching days in the range
      daysInRange.forEach(day => {
        const dayName = format(day, 'EEEE'); 
        
        if (dayName === config.day) {
           mappedEvents.push({
             id: `${cls.id}-${format(day, 'yyyy-MM-dd')}`, 
             classId: cls.id,
             title: cls.name, 
             block: config.block,
             date: day,
             teacherName,
             location: cls.location || undefined,
             isConflict: conflictingClassIds.has(cls.id),
             rawConfig: config,
           });
        }
      });
    });

    return mappedEvents;
  }, [classes, currentDate, view, selectedTeacher, selectedLocation]);

  const handlePrevious = () => {
    if (view === 'week') setCurrentDate((prev) => subWeeks(prev, 1));
    else setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNext = () => {
    if (view === 'week') setCurrentDate((prev) => addWeeks(prev, 1));
    else setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  // Generate grid info
  const gridStart = view === 'week' 
    ? startOfWeek(currentDate, { weekStartsOn: 0 })
    : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  
  const gridEnd = view === 'week'
    ? addDays(gridStart, 6)
    : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  
  return (
    <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
    >
        <div className="flex flex-col h-full space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold tracking-tight w-[200px]">
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

            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            
            {/* Filters */}
            <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {uniqueTeachers.map(teacher => (
                    <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
                    ))}
                </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            
            <div className="h-6 w-px bg-border hidden sm:block" />

            <Tabs value={view} onValueChange={(v) => setView(v as CalculatorView)}>
                <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
            </Tabs>
            </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 rounded-md border bg-background overflow-auto relative min-h-[0px]">
            {/* Week Header Row */}
            <div className="flex border-b sticky top-0 bg-background z-20">
                {view === 'week' && <div className="w-24 flex-none border-r bg-muted/50 p-2 font-semibold text-sm text-center">Blocks</div>}
                {days.slice(0, 7).map((day) => (
                    <div key={day.toString()} className={cn(
                        "flex-1 py-2 text-center border-r last:border-r-0 min-w-[120px]",
                        isSameDay(day, new Date()) && "bg-accent/50"
                    )}>
                        <div className="text-sm font-medium text-muted-foreground">{format(day, 'EEE')}</div>
                        {view === 'week' && (
                            <div className={cn(
                                "text-xl font-bold rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1",
                                isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                            )}>
                                {format(day, 'd')}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className="flex relative flex-1 min-h-0">
                {view === 'week' ? (
                <>
                    {/* Block Axis */}
                    <div className="w-24 flex-none border-r bg-muted/10">
                        {BLOCKS.map(block => (
                            <div key={block} className="h-[100px] border-b text-sm font-medium text-muted-foreground flex items-center justify-center bg-muted/20">
                                {block}
                            </div>
                        ))}
                    </div>

                    {/* Week Columns */}
                    <div className="flex flex-1">
                    {days.map((day) => (
                        <div key={day.toString()} className={cn(
                            "flex-1 border-r last:border-r-0 relative min-w-[120px]",
                            isSameDay(day, new Date()) && "bg-accent/5"
                        )}>
                            {BLOCKS.map(block => {
                                const dayName = format(day, 'EEEE');
                                const blockId = `${dayName}-${block}`;
                                return (
                                    <DroppableBlock 
                                        key={block} 
                                        id={blockId} 
                                        data={{ day: dayName, block: block, date: day }}
                                        className="h-[100px] border-b border-dashed border-muted/50 relative p-1"
                                    >
                                        {events
                                            .filter(e => isSameDay(e.date, day) && e.block === block)
                                            .map(event => (
                                                <DraggableEventWrapper 
                                                    key={event.id}
                                                    id={event.id}
                                                    data={event}
                                                >
                                                    <CalendarEventCard 
                                                        event={event}
                                                        isMonthView={false}
                                                    />
                                                </DraggableEventWrapper>
                                            ))
                                        }
                                    </DroppableBlock>
                                );
                            })}
                        </div>
                    ))}
                    </div>
                </>
                ) : (
                /* Month Grid */
                <div className="grid grid-cols-7 w-full auto-rows-fr h-full">
                    {days.map((day) => {
                    const dayEvents = events.filter(e => isSameDay(e.date, day));
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    
                    return (
                        <div key={day.toString()} className={cn(
                            "border-b border-r min-h-[100px] p-2 relative transition-colors",
                            !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                            isSameDay(day, new Date()) && "bg-accent/20"
                        )}>
                        <div className="flex justify-between items-start mb-1">
                            <span className={cn(
                            "text-sm font-medium rounded-full w-7 h-7 flex items-center justify-center",
                            isSameDay(day, new Date()) && "bg-primary text-primary-foreground"
                            )}>
                            {format(day, 'd')}
                            </span>
                        </div>
                        
                        <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                                // No drag in month view for now
                                <CalendarEventCard 
                                    key={event.id}
                                    event={event}
                                    isMonthView={true}
                                />
                            ))}
                            {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground pl-1">
                                + {dayEvents.length - 3} more
                            </div>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>
                )}
            </div>
        </div>
        
        </div>
        
        <DragOverlay>
            {activeDragEvent ? (
                <div className="w-[150px] opacity-80">
                     <CalendarEventCard 
                        event={activeDragEvent}
                        isMonthView={false}
                    />
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}
