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

export function ClassDetailCard({ description, teacher }: ClassDetailCardProps) {
  const teacherName = teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : 'Unknown Teacher';
  const initials = teacher ? `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}` : '?';

  return (
    <Card>
      <CardHeader>
        <CardTitle>About this Class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <div className="text-muted-foreground whitespace-pre-wrap">{description || 'No description provided.'}</div>
        </div>
        
        <div>
           <h4 className="font-semibold mb-3">Instructor</h4>
           <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
              <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                  <p className="font-medium">{teacherName}</p>
                  {teacher?.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
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
