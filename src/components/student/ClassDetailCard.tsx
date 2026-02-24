import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail } from 'lucide-react';

interface ClassDetailCardProps {
  description: string | null;
  teacher: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export function ClassDetailCard({
  description,
  teacher,
}: ClassDetailCardProps) {
  const teacherName = teacher
    ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim()
    : 'Unknown Teacher';
  const initials = teacher
    ? `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`
    : '?';

  return (
    <Card>
      <CardHeader>
        <CardTitle>About this Class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="mb-2 font-semibold">Description</h4>
          <div className="text-muted-foreground whitespace-pre-wrap">
            {description || 'No description provided.'}
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold">Instructor</h4>
          <div className="bg-muted/20 flex items-center gap-4 rounded-lg border p-4">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{teacherName}</p>
              {teacher?.email && (
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3" />
                  <span>{teacher.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
