"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CalendarClass, SchedulePattern, TimeBlock } from "@/types/calendar";
import { DraggableClassCard } from "./DraggableClassCard";
import { Plus } from "lucide-react";

interface CalendarBlockProps {
  block: TimeBlock;
  pattern: SchedulePattern;
  classes: CalendarClass[];
  onClassClick?: (c: CalendarClass) => void;
  onReferenceClick?: (block: TimeBlock, pattern: SchedulePattern) => void;
}

export function CalendarBlock({ 
  block, 
  pattern, 
  classes, 
  onClassClick,
  onReferenceClick 
}: CalendarBlockProps) {
  const id = `${pattern}::${block}`;
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'block',
      block,
      pattern
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] p-2 rounded-md border text-sm transition-colors relative flex flex-col gap-2",
        isOver ? "bg-accent border-primary ring-2 ring-primary/20" : "bg-card border-border",
        "hover:bg-accent/50 group"
      )}
    >
      <div className="absolute inset-0 z-0" onClick={() => onReferenceClick?.(block, pattern)} />
      
      {classes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <Plus className="w-5 h-5 text-muted-foreground/50" />
        </div>
      )}

      {classes.map((c) => (
        <div key={c.id} className="relative z-10 h-full">
           <DraggableClassCard classItem={c} onClick={() => onClassClick?.(c)} />
        </div>
      ))}
    </div>
  );
}
