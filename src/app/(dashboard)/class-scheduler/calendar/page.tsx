import { MasterCalendarGrid } from '@/components/class-scheduler/MasterCalendarGrid';

export default function SchedulerCalendarPage() {
  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Master Calendar</h1>
      </div>

      <MasterCalendarGrid />
    </div>
  );
}
