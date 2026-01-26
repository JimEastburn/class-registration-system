import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

export default function ClassSchedulePage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>View the layout of classes across the week.</CardDescription>
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
                                    {DAYS.map((day) => (
                                        <div 
                                            key={`${day}-${hour}`} 
                                            className="min-h-[80px] border-b border-r border-border p-2 hover:bg-muted/10 transition-colors"
                                            aria-label={`${day} at ${formatHour(hour)}`}
                                        >
                                            {/* Content placeholder */}
                                        </div>
                                    ))}
                                </>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
