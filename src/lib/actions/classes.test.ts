import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClass, updateClass, publishClass } from '@/lib/actions/classes';
import {
  seedFake,
  TEACHER_PROFILE,
  type SeedClass,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendClassCancellation: vi.fn(),
  sendScheduleChangeNotification: vi.fn(),
}));
vi.mock('@/lib/logic/scheduling', () => ({
  validateScheduleConfig: vi.fn().mockReturnValue({ valid: true }),
  checkScheduleConflict: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/logic/calendar', () => ({
  generateClassEvents: vi.fn().mockReturnValue([]),
}));

// ── Seed Data ───────────────────────────────────────────────────────────────

// Use teacher-123 from shared TEACHER_PROFILE
const TEACHER_ID = TEACHER_PROFILE.id;

const existingClass: SeedClass = {
  id: 'class-1', name: 'Math 101', teacher_id: TEACHER_ID, status: 'draft',
  price: 30, capacity: 20,
  day: null, block: null, start_date: null, end_date: null,
  location: null, description: null, schedule_config: null, age_min: null, age_max: null,
};

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: TEACHER_ID,
    data: {
      profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
      classes: [existingClass] as unknown as Record<string, unknown>[],
      calendar_events: [],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Class Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('createClass', () => {
    it('allows teacher to create draft class', async () => {
      seed();
      const result = await createClass({ name: 'Art 101', capacity: 20 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.classId).toBeDefined();
    });

    it('correctly maps schedule config to columns', async () => {
      const fake = seed();
      const input = {
        name: 'Music 201',
        capacity: 20,
        schedule_config: {
          day: 'Tuesday',
          block: 'Block 2 (10:00 AM - 11:00 AM)',
          startDate: '2025-01-01',
          endDate: '2025-05-31',
        },
      };

      // @ts-expect-error - complex union type on schedule_config day/block
      const result = await createClass(input);
      expect(result.success).toBe(true);

      const storedClass = fake.db.classes.find((c) => c.name === 'Music 201');
      expect(storedClass).toBeDefined();
      expect(storedClass!.day).toBe('Tuesday');
      expect(storedClass!.block).toBe('Block 2 (10:00 AM - 11:00 AM)');
      expect(storedClass!.start_date).toBe('2025-01-01');
      expect(storedClass!.end_date).toBe('2025-05-31');
      expect(storedClass!.schedule_config).toEqual(expect.objectContaining({ day: 'Tuesday' }));
    });

    it('denies parent role', async () => {
      const fake = seedFake({
        authUserId: 'parent-1',
        data: {
          profiles: [{ id: 'parent-1', first_name: 'Parent', last_name: 'User', role: 'parent' }] as unknown as Record<string, unknown>[],
          classes: [],
          calendar_events: [],
        },
      });
      const result = await createClass({ name: 'Art', capacity: 10 });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Not authorized');
    });
  });

  describe('updateClass', () => {
    it('allows owner to update class', async () => {
      const fake = seed();
      const result = await updateClass('class-1', { name: 'Math 102' });
      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.name).toBe('Math 102');
    });

    it('denies non-owner (if not admin) to update class', async () => {
      seed({
        profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        classes: [{ ...existingClass, teacher_id: 'teacher-2' }] as unknown as Record<string, unknown>[],
      });
      const result = await updateClass('class-1', { name: 'Math 102' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Not authorized');
    });

    it('allows clearing location (setting to null)', async () => {
      const fake = seed({
        classes: [{ ...existingClass, location: 'Old Location' }] as unknown as Record<string, unknown>[],
      });
      const result = await updateClass('class-1', { location: null });
      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.location).toBeNull();
    });
  });

  describe('publishClass', () => {
    it('rejects publishing when day and block are not set', async () => {
      seed();
      const result = await publishClass('class-1');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Day and Block must be assigned');
    });

    it('allows publishing when day and block are set', async () => {
      const fake = seed({
        classes: [{ ...existingClass, day: 'Tuesday', block: 'Block 1' }] as unknown as Record<string, unknown>[],
      });
      const result = await publishClass('class-1');
      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.status).toBe('published');
    });
  });
});
