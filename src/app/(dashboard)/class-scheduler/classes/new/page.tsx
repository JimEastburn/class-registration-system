import { SchedulerClassForm } from '@/components/class-scheduler/SchedulerClassForm';

export default function NewClassPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Create New Class</h1>
            <SchedulerClassForm />
        </div>
    );
}
