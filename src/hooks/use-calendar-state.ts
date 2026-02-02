import { useState, useCallback } from "react";
import { CalendarClass, SchedulePattern, TimeBlock } from "@/types/calendar";
import { toast } from "sonner";

interface UseCalendarStateProps {
  initialClasses: CalendarClass[];
  onUpdateClass?: (classId: string, updates: { time_block: string | null; schedule_pattern: string | null }) => Promise<void>;
}

export function useCalendarState({ initialClasses, onUpdateClass }: UseCalendarStateProps) {
  const [classes, setClasses] = useState<CalendarClass[]>(initialClasses);

  // Helper to find conflicts
  const checkConflict = useCallback((teacherId: string, pattern: SchedulePattern, block: TimeBlock, excludeClassId: string) => {
    // Determine overlapping patterns
    // Tu/Th conflicts with Tu/Th, Tu, AND Th
    // Tu conflicts with Tu/Th AND Tu
    // Th conflicts with Tu/Th AND Th
    // Wed conflicts only with Wed (simplified logic)
    
    // Actually, let's simplify: Any class with same teacher in same block needs check.
    // If NEW is Tu/Th: Conflict if teacher has ANY class in Tu, Th, or Tu/Th in this block.
    // If NEW is Tu: Conflict if teacher has Tu or Tu/Th in this block.
    
    const conflicting = classes.find(c => {
      if (c.id === excludeClassId) return false;
      if (c.teacher_id !== teacherId) return false;
      if (c.time_block !== block) return false;
      if (!c.schedule_pattern) return false; // Should not happen for assigned classes

      const existingPattern = c.schedule_pattern as SchedulePattern;

      // Conflict Matrix
      if (pattern === 'Tu/Th') {
         return ['Tu/Th', 'Tu', 'Th'].includes(existingPattern);
      }
      if (pattern === 'Tu') {
         return ['Tu/Th', 'Tu'].includes(existingPattern);
      }
      if (pattern === 'Th') {
         return ['Tu/Th', 'Th'].includes(existingPattern);
      }
      if (pattern === 'Wed') {
         return existingPattern === 'Wed';
      }
      return false;
    });

    return conflicting;
  }, [classes]);

  const moveClass = useCallback(async (classId: string, toBlock: TimeBlock, toPattern: SchedulePattern) => {
    const classItem = classes.find(c => c.id === classId);
    if (!classItem) return;

    // Check conflict
    const conflict = checkConflict(classItem.teacher_id, toPattern, toBlock, classId);
    if (conflict) {
      toast.error(`Teacher ${classItem.teacher?.last_name} is already busy in ${toBlock} (${conflict.schedule_pattern})`);
      return false; // Indicating failure to move
    }

    // Optimistic Update
    const previousState = [...classes];
    setClasses(prev => prev.map(c => 
      c.id === classId 
        ? { ...c, time_block: toBlock, schedule_pattern: toPattern } 
        : c
    ));

    try {
      if (onUpdateClass) {
        await onUpdateClass(classId, { time_block: toBlock, schedule_pattern: toPattern });
      }
      toast.success("Class moved");
      return true;
    } catch {
      // Revert
      setClasses(previousState);
      toast.error("Failed to save schedule change");
      return false;
    }
  }, [classes, checkConflict, onUpdateClass]);

  const unassignClass = useCallback(async (classId: string) => {
    // Optimistic
    const previousState = [...classes];
    setClasses(prev => prev.map(c => 
        c.id === classId 
          ? { ...c, time_block: null, schedule_pattern: null } 
          : c
      ));
    
    try {
        if (onUpdateClass) {
            await onUpdateClass(classId, { time_block: null, schedule_pattern: null });
        }
    } catch {
        setClasses(previousState);
        toast.error("Failed to unassign class");
    }

  }, [classes, onUpdateClass]);

  return {
    classes,
    moveClass,
    unassignClass
  };
}
