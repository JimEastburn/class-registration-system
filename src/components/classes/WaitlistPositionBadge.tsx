'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaitlistPositionBadgeProps {
  position: number;
  totalWaitlisted?: number;
  variant?: 'default' | 'compact';
  className?: string;
}

/**
 * A badge component that displays a student's position on the waitlist.
 * Shows both the position and optionally the total number of people on the waitlist.
 */
export function WaitlistPositionBadge({
  position,
  totalWaitlisted,
  variant = 'default',
  className,
}: WaitlistPositionBadgeProps) {
  const getPositionLabel = (pos: number) => {
    const suffix =
      pos === 1 ? 'st' :
      pos === 2 ? 'nd' :
      pos === 3 ? 'rd' : 'th';
    return `${pos}${suffix}`;
  };

  if (variant === 'compact') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 bg-amber-50 text-amber-700 border-amber-200',
          className
        )}
      >
        <Clock className="h-3 w-3" />
        #{position}
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200 px-3 py-1"
      >
        <Clock className="h-4 w-4" />
        <span className="font-semibold">{getPositionLabel(position)}</span>
        <span className="text-amber-600">on waitlist</span>
      </Badge>
      {totalWaitlisted !== undefined && totalWaitlisted > 1 && (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {totalWaitlisted} waiting
        </span>
      )}
    </div>
  );
}

/**
 * A simple inline indicator for waitlist status
 */
export function WaitlistIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 text-amber-600', className)}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">Waitlisted</span>
    </div>
  );
}
