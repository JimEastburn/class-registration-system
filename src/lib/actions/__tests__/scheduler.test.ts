import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSchedulerStats, getUnscheduledClasses } from '../scheduler';
import {
  seedFake,
  SCHEDULER_PROFILE,
  PARENT_PROFILE,
  type SeedClass,
} from '@/__integration__/fakes/fixtures';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/logic/scheduling', () => ({
  checkScheduleConflict: vi.fn().mockReturnValue(null),
}));

// ── Seed Data ───────────────────────────────────────────────────────────────

const scheduledClass1: SeedClass = {
  id: 'class-1', name: 'Math 101', status: 'published',
  day: 'Monday', block: 'Block 1', teacher_id: 'teacher-1',
};

const scheduledClass2: SeedClass = {
  id: 'class-2', name: 'Science 101', status: 'draft',
  day: 'Tuesday', block: 'Block 2', teacher_id: 'teacher-2',
};

const unscheduledClass: SeedClass = {
  id: 'class-3', name: 'Unscheduled Class', status: 'draft',
  day: null, block: null, teacher_id: 'teacher-1',
};

const cancelledClass: SeedClass = {
  id: 'class-4', name: 'Cancelled Class', status: 'cancelled',
  day: null, block: null, teacher_id: 'teacher-1',
};

const allClasses = [scheduledClass1, scheduledClass2, unscheduledClass, cancelledClass];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Scheduler Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getSchedulerStats', () => {
    it('should return correct stats for class_scheduler', async () => {
      seedFake({
        authUserId: 'scheduler-123',
        data: {
          profiles: [SCHEDULER_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
          classes: allClasses as unknown as Record<string, unknown>[],
        },
      });

      const result = await getSchedulerStats();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalClasses).toBe(3);
        expect(result.data.unscheduledCount).toBe(1);
        expect(result.data.conflictCount).toBe(0);
      }
    });

    it('should return unauthorized for parent', async () => {
      seedFake({
        authUserId: 'parent-123',
        data: {
          profiles: [SCHEDULER_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
          classes: allClasses as unknown as Record<string, unknown>[],
        },
      });

      const result = await getSchedulerStats();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unauthorized');
      }
    });
  });

  describe('getUnscheduledClasses', () => {
    it('should return list of unscheduled classes (no day assigned)', async () => {
      seedFake({
        authUserId: 'scheduler-123',
        data: {
          profiles: [SCHEDULER_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
          classes: allClasses as unknown as Record<string, unknown>[],
        },
      });

      const result = await getUnscheduledClasses(5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Unscheduled Class');
      }
    });
  });
});
