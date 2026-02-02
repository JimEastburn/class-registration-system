import { getSchedulerStats, getUnscheduledClasses } from '@/lib/actions/scheduler';
import { SchedulerStatsCards } from '@/components/class-scheduler/SchedulerStatsCards';
import { UnscheduledClassesList } from '@/components/class-scheduler/UnscheduledClassesList';
import { ConflictAlertsList } from '@/components/class-scheduler/ConflictAlertsList';

export default async function SchedulerDashboard() {
    const [statsRes, unscheduledRes] = await Promise.all([
        getSchedulerStats(),
        getUnscheduledClasses(5)
    ]);

    const stats = statsRes.success && statsRes.data 
        ? statsRes.data 
        : { totalClasses: 0, unscheduledCount: 0, conflictCount: 0 };
    
    const unscheduled = unscheduledRes.success && unscheduledRes.data 
        ? unscheduledRes.data 
        : [];

    return (
        <div className="space-y-6 container mx-auto py-6">
            <h1 className="text-3xl font-bold tracking-tight">Scheduler Dashboard</h1>
            
            <SchedulerStatsCards stats={stats} />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <UnscheduledClassesList classes={unscheduled} />
                <ConflictAlertsList />
            </div>
        </div>
    );
}
