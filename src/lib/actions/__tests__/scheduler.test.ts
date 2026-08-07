import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSchedulerStats,
  getUnscheduledClasses,
  schedulerCreateClass,
  schedulerUpdateClass,
} from '../scheduler';
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
  // schedulerUpdateClass also calls checkRoomConflict; without it here the
  // import is undefined and any update carrying a location throws.
  checkRoomConflict: vi.fn().mockReturnValue(null),
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

  describe('schedulerCreateClass', () => {
    it('should persist age_min and age_max when provided', async () => {
      const fake = seedFake({
        authUserId: 'scheduler-123',
        data: {
          profiles: [SCHEDULER_PROFILE] as unknown as Record<string, unknown>[],
          classes: [] as unknown as Record<string, unknown>[],
        },
      });

      const result = await schedulerCreateClass({
        name: 'Art for Kids',
        teacher_id: 'teacher-1',
        capacity: 15,
        age_min: 5,
        age_max: 12,
        schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classId).toBeDefined();
      }

      // Verify the inserted row has age_min and age_max
      const insertedClasses = fake.db.classes as Record<string, unknown>[];
      expect(insertedClasses).toHaveLength(1);
      expect(insertedClasses[0]).toMatchObject({
        age_min: 5,
        age_max: 12,
      });
    });
  });

  /**
   * schedulerUpdateClass is a generic Partial<Class> passthrough running on the
   * admin client, so a `status: 'cancelled'` in the payload used to flip the
   * class and tell nobody. Cancellation belongs to cancelClass(), which also
   * cancels enrollments and emails families. See
   * 20260806120000_cancel_enrollments_with_class.sql.
   */
  describe('schedulerUpdateClass', () => {
    const seedScheduler = (classes: SeedClass[]) =>
      seedFake({
        authUserId: SCHEDULER_PROFILE.id,
        data: {
          profiles: [SCHEDULER_PROFILE] as unknown as Record<string, unknown>[],
          classes: classes as unknown as Record<string, unknown>[],
        },
      });

    it('rejects a status change to cancelled', async () => {
      const fake = seedScheduler([scheduledClass1]);

      const result = await schedulerUpdateClass('class-1', {
        status: 'cancelled',
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Cancel Class');
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.status).toBe(
        'published'
      );
    });

    it('still allows publishing and un-publishing', async () => {
      const fake = seedScheduler([scheduledClass2]);

      const result = await schedulerUpdateClass('class-2', {
        status: 'published',
      });

      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-2')!.status).toBe(
        'published'
      );
    });

    it('still allows editing a class that is already cancelled', async () => {
      const fake = seedScheduler([cancelledClass]);

      const result = await schedulerUpdateClass('class-4', {
        name: 'Cancelled Class (renamed)',
        status: 'cancelled',
      });

      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-4')!.name).toBe(
        'Cancelled Class (renamed)'
      );
    });
  });
});

