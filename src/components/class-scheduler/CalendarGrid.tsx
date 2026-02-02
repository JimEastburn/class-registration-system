"use client";

import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import { useState } from "react";
import { CalendarClass, SchedulePattern, TimeBlock, DragItem } from "@/types/calendar";
import { useCalendarState } from "@/hooks/use-calendar-state";
import { CalendarRow } from "./CalendarRow";
import { StagingArea } from "./StagingArea";
import { DraggableClassCard } from "./DraggableClassCard";
import { updateClassSchedule, upsertClass } from "@/lib/actions/calendar";
import { createPortal } from "react-dom";
import { ClassDetailsModal } from "./ClassDetailsModal";
import { checkTeacherAvailability } from "@/lib/logic/scheduling";
import { toast } from "sonner";

interface CalendarGridProps {
  classes: CalendarClass[];
  teachers: { id: string; first_name: string; last_name: string }[];
}

const PATTERNS: SchedulePattern[] = ['Tu/Th', 'Tu', 'Th', 'Wed'];

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function CalendarGrid({ classes: initialClasses, teachers }: CalendarGridProps) {
  const { classes, moveClass, unassignClass } = useCalendarState({ 
    initialClasses, 
    onUpdateClass: (id, updates) => updateClassSchedule(id, updates as any) // Cast to satisfy strict SchedulePattern/TimeBlock check 
  });

  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<CalendarClass | null>(null);
  const [prefillData, setPrefillData] = useState<{ block: TimeBlock, pattern: SchedulePattern } | undefined>(undefined);

  const handleEditClass = (classItem: CalendarClass) => {
    setSelectedClass(classItem);
    setPrefillData(undefined);
    setModalOpen(true);
  };

  const handleCreateClass = (block: TimeBlock, pattern: SchedulePattern) => {
    setSelectedClass(null);
    setPrefillData({ block, pattern });
    setModalOpen(true);
  };

  const handleSaveClass = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    await upsertClass(data);
    setModalOpen(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: { active: { data: { current: unknown } } }) => {
    setActiveDragItem(event.active.data.current as DragItem);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeData = active.data.current as DragItem;
    const overData = over.data.current as { type: string; block?: TimeBlock; pattern?: SchedulePattern };

    if (!activeData || !overData) return;

    // Dropped on Staging Area -> Unassign
    if (overData.type === 'staging') {
      if (activeData.data.time_block) {
        await unassignClass(activeData.id);
      }
      return;
    }

    // Dropped on Calendar Block -> Assign/Move
    if (overData.type === 'block') {
      const targetBlock = overData.block as TimeBlock;
      const targetPattern = overData.pattern as SchedulePattern;

      if (activeData.data.time_block === targetBlock && activeData.data.schedule_pattern === targetPattern) {
        return; // No change
      }

      // Conflict Check
      const { hasConflict, conflictingClass } = checkTeacherAvailability(
        activeData.data.teacher_id,
        targetBlock,
        targetPattern,
        activeData.id,
        classes
      );

      if (hasConflict) {
        toast.error(`Scheduling Conflict`, {
          description: `Teacher is already teaching ${conflictingClass?.name} during this block.`
        });
        return;
      }

      await moveClass(activeData.id, targetBlock, targetPattern);
    }
  };

  // derived state
  const unassignedClasses = classes.filter(c => !c.time_block || !c.schedule_pattern);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Staging Area (Left Sidebar) */}
        <div className="w-[280px] shrink-0">
          <StagingArea unassignedClasses={unassignedClasses} onClassClick={handleEditClass} />
        </div>

        {/* Main Grid */}
        <div className="flex-1 overflow-auto border rounded-xl shadow-sm bg-background/50 p-4">
          
          {/* Header Row */}
          <div className="grid grid-cols-[100px_1fr_1fr_0.5fr_1fr_1fr_1fr] gap-2 mb-4 sticky top-0 z-20 bg-background/95 backdrop-blur py-2 border-b">
            <div className="font-bold text-center text-sm">Pattern</div>
            <div className="font-bold text-center text-sm">Block 1</div>
            <div className="font-bold text-center text-sm">Block 2</div>
            <div className="font-bold text-center text-sm">Lunch</div>
            <div className="font-bold text-center text-sm">Block 3</div>
            <div className="font-bold text-center text-sm">Block 4</div>
            <div className="font-bold text-center text-sm">Block 5</div>
          </div>

          <div className="space-y-4">
            {PATTERNS.map(pattern => (
              <CalendarRow 
                key={pattern}
                pattern={pattern}
                classes={classes.filter(c => c.schedule_pattern === pattern)}
                onClassClick={handleEditClass}
                onReferenceClick={handleCreateClass}
              />
            ))}
          </div>
        </div>
      </div>

      {typeof window !== 'undefined' && createPortal(
        <>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeDragItem ? (
              <div className="w-[200px]">
                <DraggableClassCard classItem={activeDragItem.data} />
              </div>
            ) : null}
          </DragOverlay>
          <ClassDetailsModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)}
            classItem={selectedClass}
            prefill={prefillData}
            teachers={teachers}
            onSave={handleSaveClass}
          />
        </>,
        document.body
      )}
    </DndContext>
  );
}
