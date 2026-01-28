'use client';

import React, { useState } from 'react';
import { 
    DndContext, 
    DragEndEvent, 
    DragStartEvent, 
    DragOverlay, 
    useSensor, 
    useSensors, 
    MouseSensor, 
    TouchSensor, 
    UniqueIdentifier
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateClassSchedule } from '@/lib/actions/scheduler';
import { toast } from 'sonner';
import { ScheduleClassData, TIME_BLOCKS, getClassesForBlock } from '@/lib/schedule-helpers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DAYS = ['Tuesday', 'Wednesday', 'Thursday'];

interface InteractiveScheduleProps {
    classes: ScheduleClassData[];
}

// --- Draggable Class Component ---
function DraggableClass({ classData, day }: { classData: ScheduleClassData, day: string }) {
    // Unique ID for each instance: id::day
    const uniqueId = `${classData.id}::${day}`;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: uniqueId,
        data: { ...classData, originalDay: day },
    });

    // Detect conflicts/styles (logic copied from original page)
    // We can't easily detect conflicts *inside* this component without context of other classes,
    // but we can pass styles or calculate it in parent. 
    // For simplicity, let's just make it look good.
    
    // Quick parse for styling
    let isTueThu = false;
    let isSingleDayTueOrThu = false;
    let daysLower: string[] = [];
        if (Array.isArray(classData.schedule_days)) {
        daysLower = classData.schedule_days.map(d => d.toLowerCase());
    } else if (typeof classData.schedule_days === 'string') {
        try {
            const parsed = JSON.parse(classData.schedule_days);
            if (Array.isArray(parsed)) {
                daysLower = parsed.map((d: string) => d.toLowerCase());
            }
        } catch {}
    }

    if (daysLower.length > 0) {
        isTueThu = daysLower.includes('tuesday') && daysLower.includes('thursday');
        isSingleDayTueOrThu = daysLower.length === 1 && (daysLower.includes('tuesday') || daysLower.includes('thursday'));
    }

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes}
            className={`
                text-primary border rounded p-1 mb-1 text-xs cursor-grab active:cursor-grabbing hover:shadow-md transition-all block overflow-hidden touch-none
                ${isTueThu 
                    ? 'bg-accent/20 border-accent/40 text-accent-foreground font-medium'
                    : isSingleDayTueOrThu
                        ? 'bg-green-100 border-green-300 text-green-900'
                        : 'bg-primary/10 border-primary/20'}
            `}
        >
            <div className="font-semibold truncate leading-tight flex items-center gap-1 pointer-events-none">
                {classData.name}
            </div>
            <div className="truncate opacity-80 text-[10px] pointer-events-none">
                {classData.teacher?.last_name ? `Tchr. ${classData.teacher.last_name}` : ''}
            </div>
            {classData.schedule_time && (
                <div className="text-[9px] mt-0.5 opacity-70 pointer-events-none">
                    {classData.schedule_time.slice(0, 5)}
                </div>
            )}
        </div>
    );
}

// --- Droppable Slot Component ---
function DroppableSlot({ id, day, time, children, isLunch }: { id: string, day: string, time: string, children: React.ReactNode, isLunch: boolean }) {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { day, time, isLunch },
        disabled: isLunch
    });

    return (
        <div 
            ref={setNodeRef} 
            className={`
                min-h-[120px] border-b border-r border-border p-1 relative transition-colors
                ${isLunch ? 'bg-muted/30 pattern-diagonal-lines' : ''}
                ${isOver && !isLunch ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : ''}
                ${!isLunch && !isOver ? 'hover:bg-muted/5' : ''}
            `}
        >
            {isLunch && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-xs font-bold uppercase rotate-45 pointer-events-none">
                    Lunch
                </div>
            )}
            {children}
        </div>
    );
}

export default function InteractiveSchedule({ classes }: InteractiveScheduleProps) {
    const router = useRouter();
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

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
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Extract class info and source/target info
        // active.id is "classID::originalDay"
        // over.id is "day::time" (but we rely on over.data)
        
        const activeUniqueId = active.id as string;
        const [classId, originalDay] = activeUniqueId.split('::');

        const targetData = over.data.current as { day: string, time: string, isLunch: boolean } | undefined;

        if (!targetData) return;

        if (targetData.isLunch) {
            toast.error("Classes cannot be scheduled during lunch.");
            return;
        }

        const newTime = targetData.time;
        const newDay = targetData.day;
        
        const activeClass = classes.find(c => c.id === classId);
        
        // Check for no-op
        if (activeClass && activeClass.schedule_time === newTime && originalDay === newDay) {
            return; 
        }

        // Call server action
        const toastId = toast.loading("Updating schedule...");
        
        const result = await updateClassSchedule(classId, newTime, originalDay, newDay);

        if (result.error) {
            toast.error(result.error, { id: toastId });
        } else {
            toast.success("Schedule updated", { id: toastId });
            router.refresh();
        }
    };

    // Find active class data for drag overlay
    let activeClassData: ScheduleClassData | null = null;
    let activeDay: string | null = null;
    
    if (activeId) {
        const [clsId, day] = (activeId as string).split('::');
        activeClassData = classes.find(c => c.id === clsId) || null;
        activeDay = day;
    }

    return (
        <DndContext 
            sensors={sensors} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
        >
             <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <div className="flex flex-row items-center justify-between space-x-4">
                        <CardDescription>Drag and drop classes to reschedule.</CardDescription>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded shadow-sm"></div>
                                <span>Single Day</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-accent/20 border border-accent/40 rounded shadow-sm"></div>
                                <span>Tue & Thu</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded shadow-sm"></div>
                                <span>Conflict</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="min-w-[1000px] overflow-x-auto">
                        <div className="grid grid-cols-[8rem_repeat(6,minmax(8rem,1fr))] border-l border-t border-border">
                            
                            {/* Header Row */}
                            <div className="p-4 border-b border-r border-border bg-muted/50 font-medium text-muted-foreground text-center sticky left-0 bg-background z-10">
                                Day
                            </div>
                            {TIME_BLOCKS.map((block) => (
                                <div key={block.id} className="p-2 border-b border-r border-border bg-muted/50 font-medium text-center text-sm flex flex-col items-center justify-center">
                                    <span className="font-semibold">{block.label}</span>
                                    <span className="text-xs text-muted-foreground font-normal">{block.timeRange}</span>
                                </div>
                            ))}

                            {/* Data Rows */}
                            {DAYS.map((day) => (
                                <div key={day} className="contents">
                                    <div className="p-4 border-b border-r border-border bg-muted/20 font-medium items-center flex justify-center sticky left-0 bg-background z-10 whitespace-normal break-words text-center leading-tight">
                                        {day}
                                    </div>
                                    
                                    {TIME_BLOCKS.map((block) => {
                                        const classesInBlock = getClassesForBlock(classes, day, block.startTime);
                                        const isLunch = block.id === 'lunch';
                                        
                                        // Conflicts (visual only here, server validates move)
                                        const teacherCounts = new Map<string, number>();
                                        classesInBlock.forEach(c => {
                                            if (c.teacher_id) teacherCounts.set(c.teacher_id, (teacherCounts.get(c.teacher_id) || 0) + 1);
                                        });

                                        return (
                                            <DroppableSlot 
                                                key={`${day}-${block.id}`} 
                                                id={`${day}::${block.startTime}`} // Unique ID for droppable
                                                day={day}
                                                time={block.startTime}
                                                isLunch={isLunch}
                                            >
                                                {classesInBlock.map(cls => {
                                                    const isConflict = cls.teacher_id && (teacherCounts.get(cls.teacher_id) || 0) > 1;
                                                    
                                                    return (
                                                        <div key={`${cls.id}-${day}`}> 
                                                            {/* Explicitly keyed by id AND day for react list stability */}
                                                            <div className="relative group">
                                                                <DraggableClass classData={cls} day={day} />
                                                                {isConflict && (
                                                                    <div className="absolute top-0 right-0 p-0.5 bg-red-500 rounded-full text-[8px] text-white font-bold leading-none -mt-1 -mr-1 z-[1000] shadow-sm pointer-events-none">
                                                                        !
                                                                    </div>
                                                                )}
                                                                <Link 
                                                                    href={`/class_scheduler/classes/${cls.id}/edit`} 
                                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background rounded p-0.5 border shadow-sm z-[1001]"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </DroppableSlot>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <DragOverlay>
                {activeClassData && activeDay ? (
                    <div className="opacity-80 rotate-2 scale-105">
                         {/* Re-use styling of DraggableClass for visual */}
                         <div className="text-primary border rounded p-1 mb-1 text-xs bg-primary/20 border-primary/40 w-[120px] shadow-xl cursor-grabbing">
                            <div className="font-semibold truncate leading-tight">{activeClassData.name}</div>
                            <div className="truncate opacity-80 text-[10px]">
                                {activeClassData.teacher?.last_name ? `Tchr. ${activeClassData.teacher.last_name}` : ''}
                            </div>
                         </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
