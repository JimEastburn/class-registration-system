import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassForm } from '@/components/teacher/ClassForm';
import { getClassDetails } from '@/lib/actions/classes';

interface EditClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  const { id } = await params;
  const result = await getClassDetails(id);

  if (!result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/teacher/classes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Class</h1>
          <p className="text-muted-foreground">
            Update the details for {result.data.name}
          </p>
        </div>
      </div>

      <ClassForm mode="edit" existingClass={result.data} hideScheduleSelects />
    </div>
  );
}
