import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ClassScheduleCardProps {
  dayOfWeek: string | null;
  block: string | null;
  startDate: string | null;
  endDate: string | null;
}

export function ClassScheduleCard({
  dayOfWeek,
  block,
  startDate,
  endDate,
}: ClassScheduleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock className="text-primary h-5 w-5" />
          <div>
            <p className="font-medium">{dayOfWeek || 'TBA'}</p>
            <p className="text-muted-foreground text-sm">{block || 'TBA'}</p>
          </div>
        </div>

        {startDate && endDate && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-primary h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Course Duration</p>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(startDate), 'MMM d, yyyy')} -{' '}
                  {format(new Date(endDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
