import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ClassScheduleCardProps {
    dayOfWeek: string | null;
    startTime: string | null;
    endTime: string | null;
    startDate: string | null;
    endDate: string | null;
}

export function ClassScheduleCard({ dayOfWeek, startTime, endTime, startDate, endDate }: ClassScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
                <p className="font-medium">{dayOfWeek || 'TBA'}</p>
                <p className="text-sm text-muted-foreground">
                    {startTime && endTime ? `${startTime} - ${endTime}` : 'Time TBA'}
                </p>
            </div>
         </div>

         {startDate && endDate && (
             <div className="border-t pt-4 mt-4">
                 <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm font-medium">Course Duration</p>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
                        </p>
                    </div>
                 </div>
             </div>
         )}
      </CardContent>
    </Card>
  );
}
