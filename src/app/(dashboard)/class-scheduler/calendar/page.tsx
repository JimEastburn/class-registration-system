import { MasterCalendarGrid } from '@/components/class-scheduler/MasterCalendarGrid';

export default function SchedulerCalendarPage() {
  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Master Calendar</h1>
      </div>
      
      <MasterCalendarGrid />
    </div>
  );
}
