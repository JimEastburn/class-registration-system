import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export const metadata = {
    title: 'Class Schedule | Class Scheduler Portal',
    description: 'View the weekly class schedule.',
};

const DAYS = ['Tuesday', 'Wednesday', 'Thursday'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm (11 hours)

function formatHour(hour: number) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
}

type ClassData = {
    id: string;
    name: string;
    recurrence_pattern: string | null;
    recurrence_days: string[] | null;
    recurrence_time: string | null;
    recurrence_duration: number | null;
    schedule: string | null;
    teacher: {
        last_name: string;
    } | null;
};

function getClassesForSlot(classes: ClassData[], day: string, hour: number) {
    return classes.filter(cls => {
        // 1. Try Structured Data (Recurrence Pattern)
        if (cls.recurrence_pattern === 'weekly' || cls.recurrence_pattern === 'biweekly') {
            if (!cls.recurrence_days || !cls.recurrence_days.includes(day.toLowerCase())) return false;
            
            if (cls.recurrence_time) {
                // Parse "14:00:00" or "14:00"
                const [hStr] = cls.recurrence_time.split(':');
                const h = parseInt(hStr, 10);
                return h === hour;
            }
        }
        
        // 2. Fallback: String Parsing for legacy data
        if (cls.schedule && (!cls.recurrence_pattern || cls.recurrence_pattern === 'none')) {
             const scheduleLower = cls.schedule.toLowerCase();
             const dayAbbr = day.toLowerCase().substring(0, 3); // "mon", "tue"
             
             // Check if day is present. 
             // "Tue/Thu" contains "tue" and "thu"
             if (!scheduleLower.includes(dayAbbr)) return false;
             
             // Extract Time
             // Matches: "10:00", "10:00 am", "10am", "13:00", "3:30 PM"
             // Group 1: Hour, Group 2: Minute (opt), Group 3: AM/PM (opt)
             const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
             const match = cls.schedule.match(timeRegex);
             
             if (match) {
                 let h = parseInt(match[1], 10);
                 const ampm = match[3]?.toLowerCase();
                 
                 // Normalize to 0-23
                 if (ampm === 'pm' && h < 12) h += 12;
                 if (ampm === 'am' && h === 12) h = 0;
                 
                 // If no AM/PM, heuristic:
                 // 13-23 is definitely PM.
                 // 7-11 is likely AM.
                 // 1-6 is likely PM (e.g. "Create Art 2:00") unless context implies otherwise, but default to PM for school hours?
                 // Actually, "10:00" is usually 10am. "3:00" is usually 3pm.
                 // Let's assume if h <= 6, add 12 (since 1am-6am classes are rare).
                 if (!ampm) {
                     if (h >= 1 && h <= 6) h += 12;
                 }

                 return h === hour;
             }
        }

        return false;
    });
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
    
    const classes = (classesData || []) as unknown as ClassData[];

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
                        <div className="grid grid-cols-12 border-l border-t border-border">
                            
                            {/* Header Row */}
                            {/* Empty corner cell */}
                            <div className="p-4 border-b border-r border-border bg-muted/50 font-medium text-muted-foreground text-center sticky left-0 bg-background z-10 w-32">
                                Day
                            </div>
                            {/* Time Headers */}
                            {HOURS.map((hour) => (
                                <div key={`time-${hour}`} className="p-4 border-b border-r border-border bg-muted/50 font-medium text-center text-sm flex items-center justify-center min-w-[100px]">
                                    {formatHour(hour)}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {DAYS.map((day) => (
                                <>
                                    {/* Day Label (Row Header) */}
                                    <div className="p-4 border-b border-r border-border bg-muted/20 font-medium items-center flex justify-center sticky left-0 bg-background z-10">
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
