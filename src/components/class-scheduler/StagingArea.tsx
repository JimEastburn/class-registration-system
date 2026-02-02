"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CalendarClass } from "@/types/calendar";
import { DraggableClassCard } from "./DraggableClassCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface StagingAreaProps {
  unassignedClasses: CalendarClass[];
  onClassClick?: (c: CalendarClass) => void;
}

export function StagingArea({ unassignedClasses, onClassClick }: StagingAreaProps) {
  // We make the staging area itself a droppable zone so specific items can be dropped back here
  const { setNodeRef, isOver } = useDroppable({
    id: 'staging-area',
    data: {
      type: 'staging',
    }
  });

  return (
    <Card className={cn("h-full flex flex-col border-2 border-dashed", isOver && "bg-accent/50 border-primary")}>
      <CardHeader className="py-3 px-4 bg-muted/20 border-b">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Unassigned Classes</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {unassignedClasses.length}
          </span>
        </CardTitle>
      </CardHeader>
      <div 
        ref={setNodeRef}
        className="flex-1 overflow-hidden relative min-h-[200px]"
      >
        <ScrollArea className="h-full p-4">
          <div className="space-y-3">
             {unassignedClasses.map((c) => (
               <div key={c.id} className="h-[80px]">
                 <DraggableClassCard classItem={c} onClick={() => onClassClick?.(c)} />
               </div>
             ))}
             {unassignedClasses.length === 0 && (
               <div className="text-center text-xs text-muted-foreground py-8">
                 All classes assigned
               </div>
             )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
