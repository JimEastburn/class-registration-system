import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

export async function NextClassCard({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  
  // 1. Get enrolled class IDs
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'confirmed');

  if (!enrollments || enrollments.length === 0) {
      return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">You are not enrolled in any classes.</p>
            </CardContent>
        </Card>
      );
  }

  const classIds = enrollments.map(e => e.class_id);

  // 2. Get next event
  const now = new Date().toISOString();
  const { data: nextEvent } = await supabase
    .from('calendar_events')
    .select(`
        *,
        class:classes (
            title,
            location
        )
    `)
    .in('class_id', classIds)
    .gt('start_time', now)
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  if (!nextEvent) {
      return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Next Class</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">No upcoming classes scheduled.</p>
            </CardContent>
        </Card>
      );
  }

  // Define the interface for the joined data structure
  interface NextEventData {
    start_time: string;
    end_time: string;
    location?: string;
    class?: {
      title: string;
      location?: string;
    };
  }
  
  const event = nextEvent as unknown as NextEventData;
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Next Class</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h3 className="text-xl font-bold">{event.class?.title || 'Untitled Class'}</h3>
                <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{format(startTime, 'EEEE, MMMM d')}</span>
                </div>
            </div>
            
            <div className="flex flex-col gap-2 text-sm">
                 <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{event.location || event.class?.location || 'TBD'}</span>
                 </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
