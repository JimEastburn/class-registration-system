import { CalendarClass, SchedulePattern, TimeBlock } from "@/types/calendar";

export function checkTeacherAvailability(
  teacherId: string, 
  targetBlock: TimeBlock, 
  targetPattern: SchedulePattern,
  currentClassId: string, // Exclude the class being moved
  classes: CalendarClass[]
): { hasConflict: boolean; conflictingClass?: CalendarClass } {
  // Find classes for this teacher
  const teacherClasses = classes.filter(c => 
    c.teacher_id === teacherId && 
    c.id !== currentClassId &&
    c.time_block // Only assigned classes
  );

  // Check for conflict
  const conflicting = teacherClasses.find(c => {
    // 1. Must be in the same time block (e.g., '1' vs '1')
    if (c.time_block !== targetBlock) return false;

    // 2. Schedule Pattern Conflict
    // If exact match, yes.
    if (c.schedule_pattern === targetPattern) return true;

    // Overlap logic:
    // Tu/Th overlaps with Tu AND Th
    // Tu overlaps with Tu/Th
    // Th overlaps with Tu/Th
    
    // Normalization map?
    // Tu/Th covers [Tu, Th]
    // Tu covers [Tu]
    // Th covers [Th]
    // Wed covers [Wed]

    const patternDays: Record<SchedulePattern, string[]> = {
      'Tu/Th': ['Tu', 'Th'],
      'Tu': ['Tu'],
      'Th': ['Th'],
      'Wed': ['Wed']
    };

    const targetDays = patternDays[targetPattern];
    const existingDays = patternDays[c.schedule_pattern!];

    // Check intersection
    return targetDays.some(day => existingDays.includes(day));
  });

  return { 
    hasConflict: !!conflicting, 
    conflictingClass: conflicting 
  };
}
