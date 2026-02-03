'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Filter } from 'lucide-react';
import { getClassesForScheduler, schedulerUpdateClass } from '@/lib/actions/scheduler';
import { cn } from '@/lib/utils';
import { ClassWithTeacher, ScheduleConfig, Class } from '@/types';
import { CalendarEventCard, CalendarUIEvent } from './CalendarEventCard';
import { detectBatchConflicts } from '@/lib/logic/scheduling';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, MouseSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import { DraggableEventWrapper } from './DraggableEventWrapper';
import { DroppableBlock } from './DroppableBlock';

// Define the Matrix Structure
const COLUMNS = ['Block 1', 'Block 2', 'Lunch', 'Block 3', 'Block 4', 'Block 5'];
const ROWS = [
  'Tuesday/Thursday',
  'Tuesday',
  'Wednesday',
  'Thursday'
];

export function MasterCalendarGrid() {
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

    // Parse over.id: "${pattern}::${block}" e.g "Tuesday / Thursday::Block 1"
    // We use a custom separator '::' to avoid issues with dashes in patterns/blocks
    const overId = over.id as string;
    const [pattern, block] = overId.split('::');

    if (!pattern || !block) return;
    if (block === 'Lunch') return; // Cannot drop in lunch

    // Parse active.data
    const eventData = active.data.current as CalendarUIEvent & { rawConfig: ScheduleConfig };
    if (!eventData || !eventData.classId) return;

    // Check if changed
    if (pattern === eventData.rawConfig.day && block === eventData.rawConfig.block) {
        return; 
    }

    console.log(`Moving class ${eventData.classId} to ${pattern} ${block}`);

    // Optimistic Update
    const oldClasses = [...classes];
    
    setClasses(prev => prev.map(cls => {
        if (cls.id === eventData.classId) {
            const newConfig: ScheduleConfig = {
                ...cls.schedule_config as ScheduleConfig,
                day: pattern,
                block: block
            };
            return {
                ...cls,
                schedule_config: newConfig
            };
        }
        return cls;
    }));

    // Server Action
    const newConfig: ScheduleConfig = {
        ...eventData.rawConfig,
        day: pattern,
        block: block
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

  // Derive Matrix Events
  const events = useMemo(() => {
    if (classes.length === 0) return [];

    const mappedEvents: (CalendarUIEvent & { rawConfig: ScheduleConfig })[] = [];
    // Detect conflicts
    const conflictingClassIds = detectBatchConflicts(classes as unknown as Class[]);

    classes.forEach((cls) => {
      if (!cls.schedule_config || cls.status !== 'published') return;
      
      const config = cls.schedule_config as ScheduleConfig;
      if (!config.day || !config.block) return;

      // Apply Filters
      const teacherName = cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : 'Unknown Teacher';
      if (selectedTeacher !== 'all' && teacherName !== selectedTeacher) return;
      if (selectedLocation !== 'all' && cls.location !== selectedLocation) return; // Fixed: check cls.location not teacherName

      // Map to UI Event
      // We use a dummy date for now since this is a pattern view, 
      // but CalendarEventCard expects a Date object. We can use today.
      mappedEvents.push({
        id: cls.id, 
        classId: cls.id,
        title: cls.name, 
        block: config.block,

        teacherName,
        location: cls.location || undefined,
        isConflict: conflictingClassIds.has(cls.id),
        rawConfig: config,
      });
    });

    return mappedEvents;
  }, [classes, selectedTeacher, selectedLocation]);

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
                <h2 className="text-2xl font-bold tracking-tight">
                    Master Schedule
                </h2>

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
                </div>
            </div>

            {/* Matrix Container */}
            <div className="rounded-md border bg-background overflow-hidden flex flex-col min-w-[1000px]">
                {/* Header Row */}
                <div className="flex border-b bg-muted/40">
                    <div className="w-[180px] flex-none border-r p-3 font-semibold text-sm">Target Pattern</div>
                    {COLUMNS.map(col => (
                        <div key={col} className={cn(
                            "flex-1 p-3 text-center border-r last:border-r-0 text-sm font-semibold",
                             col === 'Lunch' && "bg-muted/20 text-muted-foreground w-[100px] flex-none"
                        )}>
                            {col}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                {ROWS.map(pattern => (
                    <div key={pattern} className="flex border-b last:border-b-0 min-h-[140px]">
                        {/* Row Header */}
                        <div className="w-[180px] flex-none border-r bg-muted/10 p-3 text-sm font-medium flex items-center">
                            {pattern}
                        </div>

                        {/* Grid Cells */}
                        {COLUMNS.map(col => {
                            // Unique ID for droppable: pattern::block
                            const cellId = `${pattern}::${col}`;
                            const isLunch = col === 'Lunch';

                            return (
                                <div key={cellId} className={cn(
                                    "flex-1 border-r last:border-r-0 relative",
                                    isLunch && "bg-muted/20 w-[100px] flex-none"
                                )}>
                                    {isLunch ? (
                                         <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground rotate-90 sm:rotate-0">
                                            LUNCH
                                        </div>
                                    ) : (
                                        <DroppableBlock 
                                            id={cellId}
                                            data={{ pattern, block: col }}
                                            className="h-full min-h-[140px] p-2"
                                        >
                                            <div className="flex flex-col gap-2">
                                                {events
                                                    .filter(e => e.rawConfig.day === pattern && e.rawConfig.block === col)
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
                                            </div>
                                        </DroppableBlock>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
        
        <DragOverlay>
            {activeDragEvent ? (
                <div className="w-[200px] opacity-80">
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
