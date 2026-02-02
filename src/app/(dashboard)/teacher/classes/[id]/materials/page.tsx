import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMaterialsForClass } from '@/lib/actions/materials';
import { AddMaterialDialog } from '@/components/teacher/AddMaterialDialog';
import { MaterialsList } from '@/components/teacher/MaterialsList';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassMaterialsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify class ownership
  const { data: classData, error } = await supabase
    .from('classes')
    .select('id, name, teacher_id')
    .eq('id', id)
    .single();

  if (error || !classData) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = classData.teacher_id === user.id;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (!isOwner && !isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Unauthorized</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage materials for this class.
        </p>
      </div>
    );
  }

  const result = await getMaterialsForClass(id);
  const materials = result.success ? result.data : [];

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-1">
              <Link href={`/teacher/classes/${id}`}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Class
              </Link>
            </Button>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{classData.name} Materials</h2>
          <p className="text-muted-foreground">
            Manage resources, files, and links for this class.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <AddMaterialDialog classId={id} />
        </div>
      </div>

      <div className="pt-4">
        <Suspense fallback={<div>Loading materials...</div>}>
          <MaterialsList materials={materials || []} />
        </Suspense>
      </div>
    </div>
  );
}
