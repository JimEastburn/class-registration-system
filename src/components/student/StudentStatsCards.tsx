import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export async function StudentStatsCards({ studentId }: { studentId: string }) {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id, classes(id, name)')
    .eq('student_id', studentId)
    .eq('status', 'confirmed');

  const classes = (enrollments ?? [])
    .map((e) => {
      const cls = e.classes as unknown as { id: string; name: string } | null;
      return cls ? { id: cls.id, name: cls.name } : null;
    })
    .filter(Boolean) as { id: string; name: string }[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Classes</CardTitle>
        <BookOpen className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{classes.length}</div>
        <p className="text-muted-foreground mb-3 text-xs">Enrolled classes</p>
        {classes.length > 0 && (
          <ul className="space-y-1">
            {classes.map((cls) => (
              <li key={cls.id}>
                <Link
                  href={`/student/classes/${cls.id}`}
                  className="text-primary group flex items-center justify-between py-1 text-sm hover:underline"
                >
                  <span className="truncate">{cls.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
