import {
  getClassesForScheduler,
  getConflictAlerts,
} from '@/lib/actions/scheduler';
import { SchedulerClassTable } from '@/components/class-scheduler/SchedulerClassTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ExportCsvButton } from '@/components/admin/ExportCsvButton';

export default async function SchedulerClassesPage() {
  const [res, conflictRes] = await Promise.all([
    getClassesForScheduler(1, 100),
    getConflictAlerts(),
  ]);

  const classes = res.success && res.data ? res.data.classes : [];
  const count = res.success && res.data ? res.data.total : 0;

  // Build a Set of class IDs involved in any conflict
  const conflictClassIds = new Set<string>();
  if (conflictRes.success && conflictRes.data) {
    for (const alert of conflictRes.data) {
      for (const cls of alert.classIds) {
        conflictClassIds.add(cls.id);
      }
    }
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Class Management</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            type="classes"
            currentParams=""
            matchingCount={count}
          />
          <Button asChild>
            <Link href="/class-scheduler/classes/new">
              <Plus className="mr-2 h-4 w-4" />
              New Class
            </Link>
          </Button>
        </div>
      </div>

      <SchedulerClassTable
        classes={classes}
        count={count}
        conflictClassIds={Array.from(conflictClassIds)}
      />
    </div>
  );
}
