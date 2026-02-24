'use client';

import Link from 'next/link';
import { Clock, Users, Calendar, DollarSign, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Class } from '@/types';

interface ClassWithTeacher extends Class {
  teacher: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ClassGridProps {
  classes: ClassWithTeacher[];
}

export function ClassGrid({ classes }: ClassGridProps) {
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      data-testid="class-grid"
    >
      {classes.map((cls) => (
        <ClassCard key={cls.id} classItem={cls} />
      ))}
    </div>
  );
}

interface ClassCardProps {
  classItem: ClassWithTeacher;
}

function ClassCard({ classItem }: ClassCardProps) {
  const teacherName = classItem.teacher
    ? `${classItem.teacher.first_name || ''} ${classItem.teacher.last_name || ''}`.trim()
    : 'TBD';

  const schedule = classItem.schedule_config;
  const day = schedule?.day || null;

  return (
    <Card className="flex flex-col" data-testid={`class-card-${classItem.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="line-clamp-2 text-lg">
            {classItem.name}
          </CardTitle>
          <Badge variant="secondary">$30.00</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
          {classItem.description || 'No description available'}
        </p>

        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{teacherName}</span>
          </div>

          {day && (
            <div className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{day}</span>
            </div>
          )}

          {schedule?.block && (
            <div className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{schedule.block}</span>
            </div>
          )}

          <div className="text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Capacity: {classItem.capacity}</span>
          </div>

          <div className="text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>$30.00</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          asChild
          data-testid="view-class-details-button"
        >
          <Link href={`/parent/browse/${classItem.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
