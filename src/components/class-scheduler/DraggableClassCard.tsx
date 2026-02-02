"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClass } from "@/types/calendar";
import { cn } from "@/lib/utils";

interface DraggableClassCardProps {
  classItem: CalendarClass;
  onClick?: () => void;
}

export function DraggableClassCard({ classItem, onClick }: DraggableClassCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: classItem.id,
    data: {
      type: 'class',
      data: classItem,
    },
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
      className={cn("touch-none cursor-grab active:cursor-grabbing", isDragging && "opacity-50 z-50")}
    >
      <Card 
        className="h-full hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
        onClick={(e) => {
          e.stopPropagation();
          // Prevent click when dragging
          if (!isDragging) onClick?.();
        }}
      >
        <CardContent className="p-3 text-xs space-y-1">
          <div className="font-semibold truncate">{classItem.name}</div>
          <div className="text-muted-foreground truncate">
            {classItem.teacher 
              ? `${classItem.teacher.first_name} ${classItem.teacher.last_name}`.trim()
              : "No Teacher"}
          </div>
          <div className="text-xs text-muted-foreground truncate">{classItem.location}</div>
        </CardContent>
      </Card>
    </div>
  );
}
