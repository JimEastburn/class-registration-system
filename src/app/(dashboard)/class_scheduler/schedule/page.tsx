import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export const metadata = {
    title: 'Class Schedule | Class Scheduler Portal',
    description: 'View the weekly class schedule.',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
        // 1. Try Structured Data
        if (cls.recurrence_pattern === 'weekly' || cls.recurrence_pattern === 'biweekly') {
            if (!cls.recurrence_days || !cls.recurrence_days.includes(day.toLowerCase())) return false;
            
            if (cls.recurrence_time) {
                // Parse "14:00:00"
                const [hStr] = cls.recurrence_time.split(':');
                const h = parseInt(hStr, 10);
                // Check if class starts within this hour (e.g. 14:00 or 14:30 is in 14 slot)
                return h === hour;
            }
        }
        
        // 2. Fallback: Simple String Parsing (Very basic)
        // Check if schedule string contains the day
        if (cls.schedule && (!cls.recurrence_pattern || cls.recurrence_pattern === 'none')) {
             if (!cls.schedule.toLowerCase().includes(day.toLowerCase().substring(0, 3))) return false;
             
             // Try to find time. This is heuristic.
             // "Mon 10am" -> match 10 and am/pm
             // If we can't parse time, maybe just don't show it or show in a "All Day" section?
             // For now, let's try to match hour
             const timeRegex = /(\d{1,2})(?::\d{2})?\s*(am|pm)/i;
             const match = cls.schedule.match(timeRegex);
             if (match) {
                 let h = parseInt(match[1], 10);
                 const ampm = match[2].toLowerCase();
                 if (ampm === 'pm' && h < 12) h += 12;
                 if (ampm === 'am' && h === 12) h = 0;
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
                    <div className="min-w-[800px] overflow-x-auto">
                        {/* Grid Container */}
                        <div className="grid grid-cols-8 border-l border-t border-border">
                            
                            {/* Header Row */}
                            {/* Empty corner cell */}
                            <div className="p-4 border-b border-r border-border bg-muted/50 font-medium text-muted-foreground text-center">
                                Time
                            </div>
                            {/* Days headers */}
                            {DAYS.map((day) => (
                                <div key={day} className="p-4 border-b border-r border-border bg-muted/50 font-medium text-center">
                                    {day}
                                </div>
                            ))}

                            {/* Time Slots Rows */}
                            {HOURS.map((hour) => (
                                <>
                                    {/* Time Label */}
                                    <div key={`time-${hour}`} className="p-4 border-b border-r border-border bg-muted/20 text-sm font-medium text-muted-foreground flex items-center justify-center">
                                        {formatHour(hour)}
                                    </div>
                                    
                                    {/* Day Slots */}
                                    {DAYS.map((day) => {
                                        const classesInSlot = getClassesForSlot(classes, day, hour);
                                        return (
                                            <div 
                                                key={`${day}-${hour}`} 
                                                className="min-h-[100px] border-b border-r border-border p-1 hover:bg-muted/5 transition-colors relative"
                                            >
                                                {classesInSlot.map(cls => (
                                                    <Link key={cls.id} href={`/class_scheduler/classes/${cls.id}/edit`}>
                                                        <div className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded p-1 mb-1 text-xs cursor-pointer transition-colors block">
                                                            <div className="font-semibold truncate">{cls.name}</div>
                                                            <div className="truncate opacity-80">
                                                                {cls.teacher?.last_name ? `Tchr. ${cls.teacher.last_name}` : ''}
                                                            </div>
                                                            {cls.recurrence_time && (
                                                                <div className="text-[10px] mt-0.5 opacity-70">
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
