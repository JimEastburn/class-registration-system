'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DraggableEventWrapperProps {
  id: string;
  children: ReactNode;
  className?: string;
  data?: Record<string, unknown>;
}

export function DraggableEventWrapper({ id, children, className, data }: DraggableEventWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(className, isDragging && "opacity-50")}
    >
      {children}
    </div>
  );
}
