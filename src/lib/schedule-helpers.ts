export type ScheduleClassData = {
    id: string;
    name: string;
    recurrence_pattern: string | null;
    recurrence_days: string[] | null;
    recurrence_time: string | null;
    recurrence_duration: number | null;
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
            // Check structured data
            if (cls.recurrence_pattern === 'weekly' || cls.recurrence_pattern === 'biweekly') {
                if (!cls.recurrence_days || !cls.recurrence_days.includes(targetDay.toLowerCase())) return false;
                
                // Strict match on start time since we migrated the data
                return cls.recurrence_time === blockStartTime;
            }
            return false;
        });
    });
}
