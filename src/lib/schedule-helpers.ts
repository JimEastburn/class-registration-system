export type ScheduleClassData = {
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

export function getClassesForSlot(classes: ScheduleClassData[], day: string, hour: number) {
    return classes.filter(cls => {
        // Handle combined days (e.g. "Tuesday/Thursday")
        const targetDays = day.includes('/') ? day.split('/') : [day];

        // Check against each target day
        return targetDays.some(targetDay => {
             // 1. Try Structured Data (Recurrence Pattern)
            if (cls.recurrence_pattern === 'weekly' || cls.recurrence_pattern === 'biweekly') {
                if (!cls.recurrence_days || !cls.recurrence_days.includes(targetDay.toLowerCase())) return false;
                
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
                const dayAbbr = targetDay.toLowerCase().substring(0, 3); // "mon", "tue"
                
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
    });
}
