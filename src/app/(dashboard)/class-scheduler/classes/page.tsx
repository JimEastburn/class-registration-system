import { getClassesForScheduler } from '@/lib/actions/scheduler';
import { SchedulerClassTable } from '@/components/class-scheduler/SchedulerClassTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function SchedulerClassesPage() {
  const res = await getClassesForScheduler(1, 100);

  const classes = res.success && res.data ? res.data.classes : [];
  const count = res.success && res.data ? res.data.total : 0;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Class Management</h1>
        <Button asChild>
          <Link href="/class-scheduler/classes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Class
          </Link>
        </Button>
      </div>

      <SchedulerClassTable classes={classes} count={count} />
    </div>
  );
}
