import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

import { getClassesForBlock, ScheduleClassData, TIME_BLOCKS } from '@/lib/schedule-helpers';

export const metadata = {
    title: 'Class Schedule | Class Scheduler Portal',
    description: 'View the weekly class schedule.',
};

const DAYS = ['Tuesday', 'Thursday', 'Wednesday'];

export default async function ClassSchedulePage() {
    const supabase = await createClient();
    
    // Fetch active classes with schedule info
    const { data: classesData } = await supabase
        .from('classes')
        .select(`
            id, 
            name, 
            recurrence_pattern, 
            recurrence_days, 
            recurrence_time, 
            recurrence_duration, 
            schedule,
            teacher_id,
            teacher:profiles!classes_teacher_id_fkey(last_name)
        `)
        .neq('status', 'cancelled');
    
    const classes = (classesData || []) as unknown as ScheduleClassData[];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Weekly Schedule</CardTitle>
                        <CardDescription>View the layout of active classes across the week.</CardDescription>
                    </div>
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
                </CardHeader>
                <CardContent>
                    <div className="min-w-[1000px] overflow-x-auto">
                        {/* Grid Container: 7 Columns (1 Label + 6 Blocks) */}
                        <div className="grid grid-cols-[8rem_repeat(6,minmax(8rem,1fr))] border-l border-t border-border">
                            
                            {/* Header Row */}
                            {/* Empty corner cell */}
                            <div className="p-4 border-b border-r border-border bg-muted/50 font-medium text-muted-foreground text-center sticky left-0 bg-background z-10">
                                Day
                            </div>
                            {/* Block Headers */}
                            {TIME_BLOCKS.map((block) => (
                                <div key={block.id} className="p-2 border-b border-r border-border bg-muted/50 font-medium text-center text-sm flex flex-col items-center justify-center">
                                    <span className="font-semibold">{block.label}</span>
                                    <span className="text-xs text-muted-foreground font-normal">{block.timeRange}</span>
                                </div>
                            ))}

                            {/* Data Rows */}
                            {DAYS.map((day) => (
                                <div key={day} className="contents">
                                    {/* Day Label (Row Header) */}
                                    <div className="p-4 border-b border-r border-border bg-muted/20 font-medium items-center flex justify-center sticky left-0 bg-background z-10 whitespace-normal break-words text-center leading-tight">
                                        {day}
                                    </div>
                                    
                                    {/* Slots for this Day */}
                                    {TIME_BLOCKS.map((block) => {
                                        const classesInBlock = getClassesForBlock(classes, day, block.startTime);
                                        
                                        // Detect conflicts: Group by teacherId
                                        const teacherCounts = new Map<string, number>();
                                        classesInBlock.forEach(c => {
                                            if (c.teacher_id) {
                                                teacherCounts.set(c.teacher_id, (teacherCounts.get(c.teacher_id) || 0) + 1);
                                            }
                                        });

                                        return (
                                            <div 
                                                key={`${day}-${block.id}`} 
                                                className="min-h-[120px] border-b border-r border-border p-1 hover:bg-muted/5 transition-colors relative"
                                            >
                                                {classesInBlock.map(cls => {
                                                    const isConflict = cls.teacher_id && (teacherCounts.get(cls.teacher_id) || 0) > 1;
                                                    
                                                    // Parse recurrence_days
                                                    let isTueThu = false;
                                                    let isSingleDayTueOrThu = false;
                                                    let daysLower: string[] = [];

                                                    if (Array.isArray(cls.recurrence_days)) {
                                                        daysLower = cls.recurrence_days.map(d => d.toLowerCase());
                                                    } else if (typeof cls.recurrence_days === 'string') {
                                                        try {
                                                            const parsed = JSON.parse(cls.recurrence_days);
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
                                                        <Link key={cls.id} href={`/class_scheduler/classes/${cls.id}/edit`} scroll={false}>
                                                            <div className={`
                                                                text-primary border rounded p-1 mb-1 text-xs cursor-pointer transition-colors block overflow-hidden
                                                                ${isConflict 
                                                                    ? 'bg-red-100 border-red-300 hover:bg-red-200 text-red-900' 
                                                                    : isTueThu 
                                                                        ? 'bg-accent/20 hover:bg-accent/30 border-accent/40 text-accent-foreground font-medium'
                                                                        : isSingleDayTueOrThu
                                                                            ? 'bg-green-100 hover:bg-green-200 border-green-300 text-green-900'
                                                                            : 'bg-primary/10 hover:bg-primary/20 border-primary/20'}
                                                            `}>
                                                                <div className="font-semibold truncate leading-tight flex items-center gap-1">
                                                                    {isConflict && <span className="text-red-600 font-bold">!</span>}
                                                                    {cls.name}
                                                                </div>
                                                                <div className="truncate opacity-80 text-[10px]">
                                                                    {cls.teacher?.last_name ? `Tchr. ${cls.teacher.last_name}` : ''}
                                                                </div>
                                                                {cls.recurrence_time && (
                                                                    <div className="text-[9px] mt-0.5 opacity-70">
                                                                        {cls.recurrence_time.slice(0, 5)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
