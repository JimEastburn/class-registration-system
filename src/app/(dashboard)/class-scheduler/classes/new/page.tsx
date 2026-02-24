import { SchedulerClassForm } from '@/components/class-scheduler/SchedulerClassForm';

export default function NewClassPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">
        Create New Class
      </h1>
      <SchedulerClassForm />
    </div>
  );
}
