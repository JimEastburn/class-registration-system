import { Class, ScheduleConfig } from '@/types';

export const VALID_DAYS = ['Tuesday/Thursday', 'Tuesday', 'Wednesday', 'Thursday'] as const;
export const VALID_BLOCKS = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5'] as const;

export type ValidDay = typeof VALID_DAYS[number];
export type ValidBlock = typeof VALID_BLOCKS[number];

/**
 * Validates if the given day and block are allowed by the system rules.
 * Rules:
 * - Days: Tuesday, Wednesday, Thursday ONLY (No Mon/Fri)
 * - Blocks: Block 1-5 ONLY (No Lunch)
 */
export function validateScheduleConfig(config: ScheduleConfig): { valid: boolean; error?: string } {
  if (!config.day || !config.block) {
    return { valid: false, error: 'Day and Block are required.' };
  }

  // Type assertion for string comparison to catch invalid strings passed from untyped sources
  if (!VALID_DAYS.includes(config.day as ValidDay)) {
    return { valid: false, error: `Invalid day: ${config.day}. Classes can only be scheduled on Tuesday, Wednesday, or Thursday.` };
  }

  if (!VALID_BLOCKS.includes(config.block as ValidBlock)) {
    return { valid: false, error: `Invalid block: ${config.block}. Classes can only be scheduled in Blocks 1-5.` };
  }

  return { valid: true };
}

/**
 * Checks if two time ranges overlap.
 * Times are expected in "HH:mm" 24-hour format.
 */
export function checkScheduleConflict(
  newClassConfig: ScheduleConfig,
  teacherId: string,
  existingClasses: Class[]
): Class | null {
  // First, validate constraints
  const uniqueConfigCheck = validateScheduleConfig(newClassConfig);
  if (!uniqueConfigCheck.valid) {
    // If invalid config, strictly speaking it's not a "conflict" with another class,
    // but semantically we can't schedule it. However, this function returns Class | null
    // (conflict found or not). 
    // For now we return null as "no conflict with existing classes" but the caller should usually validate config first.
    // Ideally, this function should perhaps throw or return a richer result, but sticking to signature:
    return null;
  }

  for (const existingClass of existingClasses) {
    // Check Status (ClassStatus type: 'draft' | 'published' | 'completed' | 'cancelled')
    if (existingClass.status === 'cancelled' || existingClass.status === 'completed') continue;
    
    // Check if same teacher
    if (existingClass.teacher_id !== teacherId) continue;

    const existingConfig = existingClass.schedule_config as ScheduleConfig;
    // Check for validity of existing config
    if (!existingConfig || !existingConfig.day || !existingConfig.block) {
        continue;
    }

    // Direct Block Conflict: Same Day AND Same Block
    if (newClassConfig.day === existingConfig.day && newClassConfig.block === existingConfig.block) {
      return existingClass;
    }
  }

  return null;
}

/**
 * Checks if a class has a room conflict with existing classes.
 * Conflict = Same Location + Same Day + Same Block
 */
export function checkRoomConflict(
  newClassConfig: ScheduleConfig,
  location: string,
  existingClasses: Class[]
): Class | null {
  const uniqueConfigCheck = validateScheduleConfig(newClassConfig);
  if (!uniqueConfigCheck.valid) return null;

  for (const existingClass of existingClasses) {
    if (existingClass.status === 'cancelled' || existingClass.status === 'completed') continue;
    if (existingClass.location !== location) continue;

    const existingConfig = existingClass.schedule_config as ScheduleConfig;
    if (!existingConfig || !existingConfig.day || !existingConfig.block) continue;

    if (newClassConfig.day === existingConfig.day && newClassConfig.block === existingConfig.block) {
      return existingClass;
    }
  }

  return null;
}

/**
 * Detects all conflicts in a batch of classes.
 * Returns a Set of Class IDs that are involved in a conflict.
 * Checks:
 * 1. Teacher Overlap (Same Teacher, Day, Block)
 * 2. Room Overlap (Same Location, Day, Block)
 */
export function detectBatchConflicts(classes: Class[]): Set<string> {
  const conflictingClassIds = new Set<string>();
  const activeClasses = classes.filter(c => c.status !== 'cancelled' && c.status !== 'completed');

  // Maps to track usage: key -> classId
  const teacherScheduleMap = new Map<string, string[]>(); // "teacherId-Day-Block" -> [classIds]
  const roomScheduleMap = new Map<string, string[]>();    // "location-Day-Block" -> [classIds]

  for (const cls of activeClasses) {
    const config = cls.schedule_config as ScheduleConfig;
    if (!config || !config.day || !config.block) continue;

    const keySuffix = `${config.day}-${config.block}`;

    // Check Teacher Conflict
    if (cls.teacher_id) {
      const teacherKey = `${cls.teacher_id}-${keySuffix}`;
      const existing = teacherScheduleMap.get(teacherKey) || [];
      existing.push(cls.id);
      teacherScheduleMap.set(teacherKey, existing);
    }

    // Check Room Conflict
    if (cls.location) {
        const roomKey = `${cls.location}-${keySuffix}`;
        const existing = roomScheduleMap.get(roomKey) || [];
        existing.push(cls.id);
        roomScheduleMap.set(roomKey, existing);
    }
  }

  // Identify conflicts
  for (const [, classIds] of teacherScheduleMap) {
    if (classIds.length > 1) {
      classIds.forEach(id => conflictingClassIds.add(id));
    }
  }

  for (const [, classIds] of roomScheduleMap) {
    if (classIds.length > 1) {
      classIds.forEach(id => conflictingClassIds.add(id));
    }
  }

  return conflictingClassIds;
}
