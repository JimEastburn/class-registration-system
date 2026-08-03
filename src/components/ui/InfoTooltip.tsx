'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  /** Accessible name for the trigger, e.g. "Why is age necessary?" */
  label: string;
  /** Bold first line of the bubble */
  title: string;
  /** Explanation shown under the title */
  children: React.ReactNode;
  /** Extra classes for the bubble - colors are tuned per surface */
  className?: string;
  /** Extra classes for the icon button */
  triggerClassName?: string;
  /** Renders `${testId}-trigger` and `${testId}-tooltip` test ids */
  testId?: string;
}

/**
 * A small circled "i" that explains a field. Opens on hover/focus and stays
 * pinned open on click, so it works on touch devices too.
 *
 * Place it inside a `relative` container - usually the field's label row - so
 * the bubble is sized and positioned against the field rather than the icon,
 * and can't spill outside the form on narrow screens.
 */
export function InfoTooltip({
  label,
  title,
  children,
  className,
  triggerClassName,
  testId = 'info',
}: InfoTooltipProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  return (
    <span className="inline-flex">
      <button
        type="button"
        className={cn(
          'rounded-full opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none',
          triggerClassName
        )}
        aria-label={label}
        aria-expanded={hovered || pinned}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => {
          setHovered(false);
          setPinned(false);
        }}
        onClick={() => setPinned(!pinned)}
        data-testid={`${testId}-trigger`}
      >
        <Info className="h-4 w-4" />
      </button>
      {(hovered || pinned) && (
        <span
          role="tooltip"
          className={cn(
            'bg-popover text-popover-foreground absolute bottom-full left-0 z-50 mb-2 w-full max-w-xs rounded-md border p-3 text-sm shadow-lg',
            className
          )}
          data-testid={`${testId}-tooltip`}
        >
          <span className="block font-semibold">{title}</span>
          <span className="mt-1 block">{children}</span>
        </span>
      )}
    </span>
  );
}
