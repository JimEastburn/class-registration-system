import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

import { getClassesForSlot, ScheduleClassData } from '@/lib/schedule-helpers';

export const metadata = {
    title: 'Class Schedule | Class Scheduler Portal',
    description: 'View the weekly class schedule.',
};

const DAYS = ['Tuesday/Thursday', 'Wednesday'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm (11 hours)

function formatHour(hour: number) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
}

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
            teacher:profiles!classes_teacher_id_fkey(last_name)
        `)
        .neq('status', 'cancelled');
    
    const classes = (classesData || []) as unknown as ScheduleClassData[];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>View the layout of active classes across the week.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="min-w-[1000px] overflow-x-auto">
                        {/* Grid Container: 12 Columns (1 Label + 11 Hours) */}
                        <div className="grid grid-cols-[8rem_repeat(11,minmax(6rem,1fr))] border-l border-t border-border">
                            
                            {/* Header Row */}
                            {/* Empty corner cell */}
                            <div className="p-4 border-b border-r border-border bg-muted/50 font-medium text-muted-foreground text-center sticky left-0 bg-background z-10">
                                Day
                            </div>
                            {/* Time Headers */}
                            {HOURS.map((hour) => (
                                <div key={`time-${hour}`} className="p-4 border-b border-r border-border bg-muted/50 font-medium text-center text-sm flex items-center justify-center">
                                    {formatHour(hour)}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {DAYS.map((day) => (
                                <>
                                    {/* Day Label (Row Header) */}
                                    <div className="p-4 border-b border-r border-border bg-muted/20 font-medium items-center flex justify-center sticky left-0 bg-background z-10 whitespace-normal break-words text-center leading-tight">
                                        {day}
                                    </div>
                                    
                                    {/* Hourly Slots for this Day */}
                                    {HOURS.map((hour) => {
                                        const classesInSlot = getClassesForSlot(classes, day, hour);
                                        return (
                                            <div 
                                                key={`${day}-${hour}`} 
                                                className="min-h-[120px] border-b border-r border-border p-1 hover:bg-muted/5 transition-colors relative"
                                            >
                                                {classesInSlot.map(cls => (
                                                    <Link key={cls.id} href={`/class_scheduler/classes/${cls.id}/edit`} scroll={false}>
                                                        <div className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded p-1 mb-1 text-xs cursor-pointer transition-colors block overflow-hidden">
                                                            <div className="font-semibold truncate leading-tight">{cls.name}</div>
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
                                                ))}
                                            </div>
                                        );
                                    })}
                                </>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
