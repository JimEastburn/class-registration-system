import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getCapacityState,
  getSeatsRemaining,
  type CapacityState,
} from '@/lib/logic/class-capacity';

interface ClassCapacityBadgeProps {
  /** Seats held — confirmed + pending. See lib/logic/class-capacity. */
  seatsTaken: number;
  capacity: number;
  /** Omit to hide the "N on waitlist" clause. */
  waitlistedCount?: number;
  /**
   * 'detail'  — badge plus a counts line, for cards and detail sidebars
   * 'compact' — one line ("12 / 12" + short tag), for dense table cells
   */
  variant?: 'detail' | 'compact';
  className?: string;
}

/** Full reuses the waitlist palette, limited the pending palette — both theme-aware. */
const stateStyles: Record<CapacityState, string> = {
  full: 'border-[var(--status-waitlisted-border)] bg-[var(--status-waitlisted-bg)] text-[var(--status-waitlisted-fg)]',
  limited:
    'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]',
  open: 'text-muted-foreground',
};

function seatsLeftLabel(remaining: number): string {
  return remaining === 1 ? 'Only 1 seat left' : `Only ${remaining} seats left`;
}

/**
 * Shows how full a class is, and — the point of this component — states plainly
 * when the next registration will land on the waitlist instead of a seat.
 */
export function ClassCapacityBadge({
  seatsTaken,
  capacity,
  waitlistedCount,
  variant = 'detail',
  className,
}: ClassCapacityBadgeProps) {
  const state = getCapacityState(seatsTaken, capacity);
  const remaining = getSeatsRemaining(seatsTaken, capacity);

  const counts = [
    `${seatsTaken} of ${capacity} filled`,
    waitlistedCount ? `${waitlistedCount} on waitlist` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
        <span
          className={cn(
            state !== 'open' && 'font-medium',
            state === 'full' && 'text-[var(--status-waitlisted-fg)]',
            state === 'limited' && 'text-[var(--status-pending-fg)]'
          )}
        >
          {seatsTaken} / {capacity}
        </span>
        {state === 'full' && (
          <Badge
            variant="outline"
            className={stateStyles.full}
            title="The next registration for this class will join the waitlist"
          >
            Full
          </Badge>
        )}
        {state === 'limited' && (
          <Badge variant="outline" className={stateStyles.limited}>
            {remaining} left
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {state === 'full' ? (
        <Badge variant="outline" className={stateStyles.full}>
          Full — next signup joins the waitlist
        </Badge>
      ) : state === 'limited' ? (
        <Badge variant="outline" className={stateStyles.limited}>
          {seatsLeftLabel(remaining)}
        </Badge>
      ) : null}
      <p className="text-muted-foreground text-xs">{counts}</p>
    </div>
  );
}
