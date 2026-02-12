import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export async function StudentStatsCards({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('class_id, classes(id, title)')
    .eq('student_id', studentId)
    .eq('status', 'confirmed');

  const classes = (enrollments ?? []).map((e) => {
    const cls = e.classes as unknown as { id: string; title: string } | null;
    return cls ? { id: cls.id, title: cls.title } : null;
  }).filter(Boolean) as { id: string; title: string }[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Classes</CardTitle>
        <BookOpen className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{classes.length}</div>
        <p className="text-xs text-muted-foreground mb-3">Enrolled classes</p>
        {classes.length > 0 && (
          <ul className="space-y-1">
            {classes.map((cls) => (
              <li key={cls.id}>
                <Link
                  href={`/student/classes/${cls.id}`}
                  className="flex items-center justify-between text-sm text-primary hover:underline py-1 group"
                >
                  <span className="truncate">{cls.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
