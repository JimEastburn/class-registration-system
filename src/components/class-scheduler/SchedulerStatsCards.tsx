import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchedulerStats } from '@/lib/actions/scheduler';
import { Calendar, AlertTriangle, Layers } from 'lucide-react';

interface SchedulerStatsCardsProps {
  stats: SchedulerStats;
}

export function SchedulerStatsCards({ stats }: SchedulerStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          <Layers className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalClasses}</div>
          <p className="text-muted-foreground text-xs">Across all semesters</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Unscheduled
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unscheduledCount}</div>
          <p className="text-muted-foreground text-xs">
            Require scheduling attention
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Conflicts Detected
          </CardTitle>
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.conflictCount}</div>
          <p className="text-muted-foreground text-xs">
            Schedule overlaps (TBD)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
