import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Class } from '@/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ClassCapacityBadge } from '@/components/classes/ClassCapacityBadge';
import type { EnrollmentCounts } from '@/lib/enrollment-counts';

interface UnscheduledClassesListProps {
  classes: (Class & EnrollmentCounts)[];
}

export function UnscheduledClassesList({
  classes,
}: UnscheduledClassesListProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Unscheduled Classes</CardTitle>
        <CardDescription>
          Draft classes needing schedule assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No unscheduled classes found.
          </p>
        ) : (
          <div className="space-y-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm leading-none font-medium">{c.name}</p>
                  <ClassCapacityBadge
                    seatsTaken={c.enrolled_count}
                    capacity={c.capacity}
                    waitlistedCount={c.waitlisted_count}
                  />
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/class-scheduler/classes/${c.id}`}>
                    Schedule <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
