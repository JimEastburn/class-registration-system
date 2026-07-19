'use client';

import { type ReactNode, UIEvent, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VolunteerGridScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function VolunteerGridScrollArea({
  children,
  className,
}: VolunteerGridScrollAreaProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'table' | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    const tableScroller = tableScrollRef.current;
    if (!tableScroller) return;

    const updateScrollWidth = () => {
      const table = tableScroller.querySelector('table');
      setScrollWidth(table?.scrollWidth ?? tableScroller.scrollWidth);
    };

    updateScrollWidth();

    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(tableScroller);

    const table = tableScroller.querySelector('table');
    if (table) {
      resizeObserver.observe(table);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  function handleTopScroll(event: UIEvent<HTMLDivElement>) {
    if (syncingRef.current === 'table') return;

    syncingRef.current = 'top';
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    syncingRef.current = null;
  }

  function handleTableScroll(event: UIEvent<HTMLDivElement>) {
    if (syncingRef.current === 'top') return;

    syncingRef.current = 'table';
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    syncingRef.current = null;
  }

  return (
    <div className={cn('bg-background rounded-lg border', className)}>
      <div
        ref={topScrollRef}
        className="bg-background sticky top-0 z-40 h-4 overflow-x-auto overflow-y-hidden border-b"
        aria-label="Scroll volunteer grid horizontally"
        role="region"
        onScroll={handleTopScroll}
      >
        <div className="h-1" style={{ width: scrollWidth }} />
      </div>
      <div
        ref={tableScrollRef}
        className="max-h-[calc(100vh-12rem)] overflow-auto"
        onScroll={handleTableScroll}
      >
        {children}
      </div>
    </div>
  );
}
