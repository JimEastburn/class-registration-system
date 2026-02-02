import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassForm } from '@/components/teacher/ClassForm';

export const metadata = {
  title: 'Create Class | Teacher Portal',
  description: 'Create a new class',
};

export default function CreateClassPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/classes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Class</h1>
          <p className="text-muted-foreground">
            Create a new class for students to enroll in.
          </p>
        </div>
      </div>

      <ClassForm mode="create" />
    </div>
  );
}
