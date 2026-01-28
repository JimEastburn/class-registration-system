export type ScheduleClassData = {
    id: string;
    name: string;
    schedule_days: string[] | null;
    schedule_time: string | null;
    schedule: string | null;
    teacher_id: string;
    teacher: {
        last_name: string;
    } | null;
};

export const TIME_BLOCKS = [
    { id: 'block-1', label: 'Block 1', timeRange: '9:30-10:40', startTime: '09:30:00' },
    { id: 'block-2', label: 'Block 2', timeRange: '10:50-12:00', startTime: '10:50:00' },
    { id: 'lunch', label: 'Lunch', timeRange: '12:00-12:50', startTime: '12:00:00' },
    { id: 'block-3', label: 'Block 3', timeRange: '12:50-2:00', startTime: '12:50:00' },
    { id: 'block-4', label: 'Block 4', timeRange: '2:10-3:20', startTime: '14:10:00' },
    { id: 'block-5', label: 'Block 5', timeRange: '3:30-4:40', startTime: '15:30:00' },
];

export function getClassesForBlock(classes: ScheduleClassData[], day: string, blockStartTime: string) {
    return classes.filter(cls => {
        // Handle combined days (e.g. "Tuesday/Thursday")
        const targetDays = day.includes('/') ? day.split('/') : [day];

        // Check against each target day
        return targetDays.some(targetDay => {
            // Check if class is scheduled on this day
            if (!cls.schedule_days || !cls.schedule_days.includes(targetDay.toLowerCase())) return false;
            
            // Strict match on start time
            return cls.schedule_time === blockStartTime;
        });
    });
}

export function formatScheduleText(days: string[] | null, time: string | null): string {
    if (!days || days.length === 0) return '';
    
    // Parse days if string
    let dayArray: string[] = [];
    if (Array.isArray(days)) {
        dayArray = days;
    } else if (typeof days === 'string') {
        try {
            dayArray = JSON.parse(days);
        } catch {}
    }

    let text = '';
    if (dayArray.length > 0) {
        const dayLabels = dayArray.map(d => d.charAt(0).toUpperCase() + d.slice(1));
        text = dayLabels.join(', ');
    }

    if (time) {
        // Convert 24h to 12h
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        if (!isNaN(hour)) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            text += ` at ${displayHour}:${m} ${ampm}`;
        }
    }
    
    return text;
}
