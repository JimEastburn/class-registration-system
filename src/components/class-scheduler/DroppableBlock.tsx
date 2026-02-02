'use client';

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DroppableBlockProps {
  id: string;
  children: ReactNode;
  className?: string;
  data?: Record<string, unknown>;
}

export function DroppableBlock({ id, children, className, data }: DroppableBlockProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "bg-accent/20 ring-2 ring-primary/20"
      )}
    >
      {children}
    </div>
  );
}
