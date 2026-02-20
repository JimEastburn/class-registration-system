import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTeacherClasses } from '@/lib/actions/classes';
import { ClassManagementTable } from '@/components/teacher/ClassManagementTable';

export const metadata = {
  title: 'My Classes | Teacher Portal',
  description: 'Manage your classes',
};

export default async function TeacherClassesPage() {
  console.error('Rendering TeacherClassesPage...'); // Log to stderr to ensure visibility
  const result = await getTeacherClasses();
  console.error('TeacherClassesPage result success:', result.success); // Log to stderr

  if (!result.success) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Unable to load classes.</p>
      </div>
    );
  }

  const classes = result.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage your classes.
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/classes/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Class
          </Link>
        </Button>
      </div>

      <ClassManagementTable classes={classes} />
    </div>
  );
}
