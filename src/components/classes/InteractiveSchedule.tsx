'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScheduleClassData, TIME_BLOCKS, getClassesForBlock } from '@/lib/schedule-helpers';
import Link from 'next/link';

const DAYS = ['Tuesday', 'Wednesday', 'Thursday'];

interface InteractiveScheduleProps {
    classes: ScheduleClassData[];
}

// --- Class Display Component ---
function ClassCard({ classData }: { classData: ScheduleClassData }) {
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

    return (
        <div 
            className={`
                text-primary border rounded p-1 mb-1 text-xs hover:shadow-md transition-all block overflow-hidden
                ${isTueThu 
                    ? 'bg-accent/20 border-accent/40 text-accent-foreground font-medium'
                    : isSingleDayTueOrThu
                        ? 'bg-green-100 border-green-300 text-green-900'
                        : 'bg-primary/10 border-primary/20'}
            `}
        >
            <div className="font-semibold truncate leading-tight flex items-center gap-1">
                {classData.name}
            </div>
            <div className="truncate opacity-80 text-[10px]">
                {classData.teacher?.last_name ? `Tchr. ${classData.teacher.last_name}` : ''}
            </div>
            {classData.schedule_time && (
                <div className="text-[9px] mt-0.5 opacity-70">
                    {classData.schedule_time.slice(0, 5)}
                </div>
            )}
        </div>
    );
}

// --- Schedule Slot Component ---
function ScheduleSlot({ children, isLunch }: { children: React.ReactNode, isLunch: boolean }) {
    return (
        <div 
            className={`
                min-h-[120px] border-b border-r border-border p-1 relative transition-colors
                ${isLunch ? 'bg-muted/30 pattern-diagonal-lines' : ''}
                ${!isLunch ? 'hover:bg-muted/5' : ''}
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
    return (
        <Card>
            <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <div className="flex flex-row items-center justify-between space-x-4">
                    <CardDescription>View the layout of active classes across the week.</CardDescription>
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
                                    
                                    // Conflicts (visual only)
                                    const teacherCounts = new Map<string, number>();
                                    classesInBlock.forEach(c => {
                                        if (c.teacher_id) teacherCounts.set(c.teacher_id, (teacherCounts.get(c.teacher_id) || 0) + 1);
                                    });

                                    return (
                                        <ScheduleSlot 
                                            key={`${day}-${block.id}`} 
                                            isLunch={isLunch}
                                        >
                                            {classesInBlock.map(cls => {
                                                const isConflict = cls.teacher_id && (teacherCounts.get(cls.teacher_id) || 0) > 1;
                                                
                                                return (
                                                    <div key={`${cls.id}-${day}`}> 
                                                        <div className="relative group">
                                                            <ClassCard classData={cls} />
                                                            {isConflict && (
                                                                <div className="absolute top-0 right-0 p-0.5 bg-red-500 rounded-full text-[8px] text-white font-bold leading-none -mt-1 -mr-1 z-[1000] shadow-sm pointer-events-none">
                                                                    !
                                                                </div>
                                                            )}
                                                            <Link 
                                                                href={`/class_scheduler/classes/${cls.id}/edit`} 
                                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background rounded p-0.5 border shadow-sm z-[1001]"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </ScheduleSlot>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
