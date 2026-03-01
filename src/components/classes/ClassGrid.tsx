'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Users, Calendar, DollarSign, User, Search, X, LayoutGrid, Minus, Plus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { ParentCalendarGrid } from '@/components/classes/ParentCalendarGrid';
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
  showCalendarToggle?: boolean;
}

export function ClassGrid({ classes, showSearch = false, showCalendarToggle = false }: ClassGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [childAge, setChildAge] = useState('0');
  const [calendarView, setCalendarView] = useState(false);

  // Apply text search filter
  let filteredClasses = searchQuery
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

  // Apply age filter
  const ageValue = childAge ? parseInt(childAge, 10) : 0;
  if (ageValue > 0 && !isNaN(ageValue)) {
    filteredClasses = filteredClasses.filter((cls) => {
      // Classes with no age range are always shown
      if (cls.age_min == null && cls.age_max == null) return true;
      // Only min set: age must be >= min
      if (cls.age_min != null && cls.age_max == null) return ageValue >= cls.age_min;
      // Only max set: age must be <= max
      if (cls.age_min == null && cls.age_max != null) return ageValue <= cls.age_max;
      // Both set: age must be within range
      return ageValue >= cls.age_min! && ageValue <= cls.age_max!;
    });
  }

  const hasActiveFilters = !!searchQuery || (ageValue > 0 && !isNaN(ageValue));

  return (
    <div className="space-y-4">
      {/* Sticky unified filter bar */}
      {(showSearch || showCalendarToggle) && (
        <div className="bg-background sticky top-16 z-20 pb-2 pt-2">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-filter-bar px-3 py-2.5">
            {/* Search input */}
            {showSearch && (
              <div className="relative min-w-[180px] flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Search by class name, teacher, day..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-background pl-9 pr-9 shadow-sm"
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
            )}

            {/* Result count */}
            {hasActiveFilters && (
              <span className="text-muted-foreground shrink-0 text-sm">
                {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} found
              </span>
            )}

            {/* Divider */}
            {showCalendarToggle && showSearch && (
              <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />
            )}

            {/* Age filter — pill stepper */}
            {showCalendarToggle && (
              <div className="flex items-center gap-3">
                <Label htmlFor="child-age-input" className="shrink-0 cursor-pointer text-sm whitespace-nowrap text-muted-foreground">
                  Child&apos;s age
                </Label>
                <div className="inline-flex items-center rounded-full border border-border/60 bg-background">
                  <button
                    type="button"
                    data-testid="age-decrement"
                    aria-label="Decrease age"
                    onClick={() => {
                      const current = parseInt(childAge, 10) || 0;
                      if (current > 0) {
                        setChildAge(String(current - 1));
                      }
                    }}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    disabled={childAge === '0'}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 min-w-[3.5rem] items-center justify-center border-x border-border/60 px-2 text-sm font-medium tabular-nums">
                    {childAge} yrs
                  </span>
                  <button
                    type="button"
                    data-testid="age-increment"
                    aria-label="Increase age"
                    onClick={() => {
                      const current = parseInt(childAge, 10) || 0;
                      if (current < 18) {
                        setChildAge(String(current + 1));
                      }
                    }}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    disabled={childAge === '18'}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {/* Visually hidden input for test compatibility */}
                <input
                  id="child-age-input"
                  type="text"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  data-testid="child-age-input"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            )}

            {/* View toggle: Cards | Calendar */}
            {showCalendarToggle && (
              <div className="inline-flex items-center gap-0.5 rounded-full bg-muted p-1" role="group" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setCalendarView(false)}
                  aria-pressed={!calendarView}
                  data-testid="view-toggle-cards"
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    !calendarView
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView(true)}
                  aria-pressed={calendarView}
                  data-testid="view-toggle-calendar"
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    calendarView
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {filteredClasses.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No classes match your filters. Try adjusting your search or age.
        </p>
      ) : calendarView ? (
        <ParentCalendarGrid classes={filteredClasses} />
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

          <div className="text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {classItem.age_min != null && classItem.age_max != null
                ? `Ages ${classItem.age_min}–${classItem.age_max}`
                : classItem.age_min != null
                  ? `Ages ${classItem.age_min}+`
                  : classItem.age_max != null
                    ? `Ages up to ${classItem.age_max}`
                    : 'All ages welcome for this class.'}
            </span>
          </div>

          <div className="text-muted-foreground flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span>$30.00 community fee</span>
              <p className="text-xs text-muted-foreground/70">Class payment, paid directly to the teacher later, is $255 for a one day a week class per semester, and the two day a week classes are $500 per semester.</p>
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
