import { getClassesForScheduler } from '@/lib/actions/scheduler';
import { SchedulerClassTable } from '@/components/class-scheduler/SchedulerClassTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';


export default async function SchedulerClassesPage() {
    const res = await getClassesForScheduler(1, 100); 

    const classes = res.success && res.data ? res.data.classes : [];
    const count = res.success && res.data ? res.data.count : 0;

    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Class Management</h1>
                <Button asChild>
                    <Link href="/class-scheduler/classes/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Class
                    </Link>
                </Button>
            </div>
            
            <SchedulerClassTable 
                classes={classes} 
                count={count} 
            />
        </div>
    );
}
