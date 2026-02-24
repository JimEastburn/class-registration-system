'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Users, Calendar, DollarSign, User, Search, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  showSearch?: boolean;
}

export function ClassGrid({ classes, showSearch = false }: ClassGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClasses = searchQuery
    ? classes.filter((cls) => {
        const query = searchQuery.toLowerCase();
        const teacherName = cls.teacher
          ? `${cls.teacher.first_name || ''} ${cls.teacher.last_name || ''}`.trim().toLowerCase()
          : '';
        const day = cls.schedule_config?.day?.toLowerCase() || '';
        const block = cls.schedule_config?.block?.toLowerCase() || '';
        return (
          cls.name.toLowerCase().includes(query) ||
          (cls.description || '').toLowerCase().includes(query) ||
          teacherName.includes(query) ||
          day.includes(query) ||
          block.includes(query)
        );
      })
    : classes;

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by class name, teacher, day, etc."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
              data-testid="class-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-muted-foreground shrink-0 text-sm">
              {filteredClasses.length} {filteredClasses.length === 1 ? 'class matches' : 'classes match'} your search
            </span>
          )}
        </div>
      )}

      {filteredClasses.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No classes match &ldquo;{searchQuery}&rdquo;. Try a different search term.
        </p>
      ) : (
        <div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          data-testid="class-grid"
        >
          {filteredClasses.map((cls) => (
            <ClassCard key={cls.id} classItem={cls} />
          ))}
        </div>
      )}
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
          <Badge variant="secondary">$30.00 community fee</Badge>
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

          <div className="text-muted-foreground flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span>$30.00 community fee</span>
              <p className="text-xs text-muted-foreground/70">Class payment, paid directly to the teacher later, is $550 per semester.</p>
            </div>
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
