import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createClass,
  updateClass,
  publishClass,
  getAllClasses,
  getAllAacEnrollmentReport,
  getClassAvailability,
} from '@/lib/actions/classes';
import {
  seedFake,
  TEACHER_PROFILE,
  ADMIN_PROFILE,
  SCHEDULER_PROFILE,
  PARENT_PROFILE,
  type SeedClass,
  type SeedEnrollment,
  type SeedProfile,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));
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
  id: 'class-1',
  name: 'Math 101',
  teacher_id: TEACHER_ID,
  status: 'draft',
  price: 30,
  capacity: 20,
  day: null,
  block: null,
  start_date: null,
  end_date: null,
  location: null,
  description: null,
  schedule_config: null,
  age_min: null,
  age_max: null,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      expect(storedClass!.schedule_config).toEqual(
        expect.objectContaining({ day: 'Tuesday' })
      );
    });

    it('denies parent role', async () => {
      const fake = seedFake({
        authUserId: 'parent-1',
        data: {
          profiles: [
            {
              id: 'parent-1',
              first_name: 'Parent',
              last_name: 'User',
              role: 'parent',
            },
          ] as unknown as Record<string, unknown>[],
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
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.name).toBe(
        'Math 102'
      );
    });

    it('denies non-owner (if not admin) to update class', async () => {
      seed({
        profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
        classes: [
          { ...existingClass, teacher_id: 'teacher-2' },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await updateClass('class-1', { name: 'Math 102' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('Not authorized');
    });

    it('allows clearing location (setting to null)', async () => {
      const fake = seed({
        classes: [
          { ...existingClass, location: 'Old Location' },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await updateClass('class-1', { location: null });
      expect(result.success).toBe(true);
      expect(
        fake.db.classes.find((c) => c.id === 'class-1')!.location
      ).toBeNull();
    });
  });

  describe('publishClass', () => {
    it('rejects publishing when day and block are not set', async () => {
      seed();
      const result = await publishClass('class-1');
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error).toContain('Day and Block must be assigned');
    });

    it('allows publishing when day and block are set', async () => {
      const fake = seed({
        classes: [
          { ...existingClass, day: 'Tuesday', block: 'Block 1' },
        ] as unknown as Record<string, unknown>[],
      });
      const result = await publishClass('class-1');
      expect(result.success).toBe(true);
      expect(fake.db.classes.find((c) => c.id === 'class-1')!.status).toBe(
        'published'
      );
    });
  });

  describe('getAllClasses', () => {
    it('returns empty result when search has no matches', async () => {
      const fake = seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          classes: [existingClass] as unknown as Record<string, unknown>[],
        },
      });
      // Stub the RPC to simulate "no matching class IDs" from Postgres
      fake.setRpcHandler('search_class_ids', () => []);

      const result = await getAllClasses({
        search: 'no-such-term',
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classes).toEqual([]);
        expect(result.data.total).toBe(0);
      }
    });

    it('returns enrolled and waitlisted counts per class', async () => {
      seedFake({
        authUserId: ADMIN_PROFILE.id,
        data: {
          profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
          classes: [
            existingClass,
            { ...existingClass, id: 'class-2', name: 'Art 101' },
          ] as unknown as Record<string, unknown>[],
          enrollments: [
            {
              id: 'enr-1',
              student_id: 'student-a',
              class_id: 'class-1',
              status: 'confirmed',
            },
            {
              id: 'enr-2',
              student_id: 'student-b',
              class_id: 'class-1',
              status: 'pending',
            },
            {
              id: 'enr-3',
              student_id: 'student-c',
              class_id: 'class-1',
              status: 'waitlisted',
              waitlist_position: 1,
            },
            {
              id: 'enr-4',
              student_id: 'student-d',
              class_id: 'class-1',
              status: 'cancelled',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      const result = await getAllClasses({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const classOne = result.data.classes.find((c) => c.id === 'class-1')!;
      // confirmed + pending both hold a seat; cancelled does not count
      expect(classOne.enrolled_count).toBe(2);
      expect(classOne.waitlisted_count).toBe(1);

      const classTwo = result.data.classes.find((c) => c.id === 'class-2')!;
      expect(classTwo.enrolled_count).toBe(0);
      expect(classTwo.waitlisted_count).toBe(0);
    });

    /**
     * Regression guard for the RLS read-path bug: getClassAvailability used to
     * COUNT enrollments through the RLS-scoped client, so a parent saw only their
     * own family's rows and a full class reported as wide open — which made
     * EnrollButton's "Class Full - Join Waitlist" branch unreachable.
     *
     * The fake does not enforce RLS, so the bug is modelled directly: the
     * enrollments table holds only what a parent could see, while the RPC (which
     * is SECURITY DEFINER in the real database) reports the true class-wide
     * numbers. Counting via a direct query would report the class as open.
     */
    it('reports a full class as full for a parent who owns none of the enrollments', async () => {
      const fake = seedFake({
        authUserId: PARENT_PROFILE.id,
        data: {
          profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
          classes: [
            { ...existingClass, capacity: 12 },
          ] as unknown as Record<string, unknown>[],
          // All this parent is allowed to see: a single unrelated row.
          enrollments: [
            {
              id: 'enr-visible',
              student_id: 'own-child',
              class_id: 'class-1',
              status: 'pending',
            },
          ] as unknown as Record<string, unknown>[],
        },
      });

      // What the definer-rights function sees: the class is actually full.
      fake.setRpcHandler('get_class_enrollment_counts', () => [
        {
          class_id: 'class-1',
          capacity: 12,
          confirmed_count: 5,
          pending_count: 7,
          waitlisted_count: 2,
        },
      ]);

      const availability = await getClassAvailability('class-1');

      expect(availability.error).toBeNull();
      expect(availability.capacity).toBe(12);
      expect(availability.enrolled).toBe(12);
      expect(availability.available).toBe(0);
    });

    describe('sorting', () => {
      // created_at deliberately disagrees with alphabetical order, so a test
      // can tell "sorted by name" apart from "left in default order".
      const sortableClasses = [
        {
          ...existingClass,
          id: 'class-1',
          name: 'Art',
          created_at: '2026-01-01',
        },
        {
          ...existingClass,
          id: 'class-2',
          name: 'Math',
          created_at: '2026-03-01',
        },
        {
          ...existingClass,
          id: 'class-3',
          name: 'Zoology',
          created_at: '2026-02-01',
        },
      ] as unknown as Record<string, unknown>[];

      function seedSortable(enrollments: Record<string, unknown>[] = []): void {
        seedFake({
          authUserId: ADMIN_PROFILE.id,
          data: {
            profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
            classes: sortableClasses,
            enrollments,
          },
        });
      }

      it('sorts by name ascending', async () => {
        seedSortable();

        const result = await getAllClasses({
          page: 1,
          limit: 20,
          sort: { key: 'name', direction: 'asc' },
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.classes.map((c) => c.name)).toEqual([
          'Art',
          'Math',
          'Zoology',
        ]);
      });

      it('sorts by name descending', async () => {
        seedSortable();

        const result = await getAllClasses({
          page: 1,
          limit: 20,
          sort: { key: 'name', direction: 'desc' },
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.classes.map((c) => c.name)).toEqual([
          'Zoology',
          'Math',
          'Art',
        ]);
      });

      it('sorts across the whole result set, not just the current page', async () => {
        seedSortable();

        const firstPage = await getAllClasses({
          page: 1,
          limit: 2,
          sort: { key: 'name', direction: 'desc' },
        });

        expect(firstPage.success).toBe(true);
        if (!firstPage.success) return;
        // Zoology and Math are the two highest names overall — they'd never
        // land on page 1 if sorting only reordered the page the DB returned.
        expect(firstPage.data.classes.map((c) => c.name)).toEqual([
          'Zoology',
          'Math',
        ]);
        expect(firstPage.data.total).toBe(3);

        const secondPage = await getAllClasses({
          page: 2,
          limit: 2,
          sort: { key: 'name', direction: 'desc' },
        });

        expect(secondPage.success).toBe(true);
        if (!secondPage.success) return;
        expect(secondPage.data.classes.map((c) => c.name)).toEqual(['Art']);
        expect(secondPage.data.total).toBe(3);
      });

      it('sorts by enrolled count, which is tallied rather than stored', async () => {
        seedSortable([
          {
            id: 'enr-1',
            student_id: 'student-a',
            class_id: 'class-3',
            status: 'confirmed',
          },
          {
            id: 'enr-2',
            student_id: 'student-b',
            class_id: 'class-3',
            status: 'pending',
          },
          {
            id: 'enr-3',
            student_id: 'student-c',
            class_id: 'class-2',
            status: 'confirmed',
          },
        ] as unknown as Record<string, unknown>[]);

        const result = await getAllClasses({
          page: 1,
          limit: 20,
          sort: { key: 'enrolled', direction: 'desc' },
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(
          result.data.classes.map((c) => [c.name, c.enrolled_count])
        ).toEqual([
          ['Zoology', 2],
          ['Math', 1],
          ['Art', 0],
        ]);
      });

      it('still returns counts for the classes on a sorted page', async () => {
        seedSortable([
          {
            id: 'enr-1',
            student_id: 'student-a',
            class_id: 'class-1',
            status: 'waitlisted',
            waitlist_position: 1,
          },
        ] as unknown as Record<string, unknown>[]);

        const result = await getAllClasses({
          page: 1,
          limit: 1,
          sort: { key: 'name', direction: 'asc' },
        });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.classes).toHaveLength(1);
        expect(result.data.classes[0].name).toBe('Art');
        expect(result.data.classes[0].waitlisted_count).toBe(1);
      });

      it('keeps the newest-first default when no sort is requested', async () => {
        seedSortable();

        const result = await getAllClasses({ page: 1, limit: 20 });

        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.classes.map((c) => c.name)).toEqual([
          'Math',
          'Zoology',
          'Art',
        ]);
      });
    });
  });

  describe('getAllAacEnrollmentReport', () => {
    const secondTeacher: SeedProfile = {
      id: 'teacher-456',
      first_name: 'Ada',
      last_name: 'Lovelace',
      role: 'teacher',
      email: 'ada@test.com',
    };

    const superAdminProfile: SeedProfile = {
      id: 'super-admin-123',
      first_name: 'Super',
      last_name: 'Admin',
      role: 'super_admin',
      email: 'super@test.com',
    };

    const studentProfile: SeedProfile = {
      id: 'student-123',
      first_name: 'Student',
      last_name: 'User',
      role: 'student',
      email: 'student@test.com',
    };

    const reportClasses: SeedClass[] = [
      {
        id: 'published-1',
        name: 'Art Foundations',
        teacher_id: TEACHER_ID,
        status: 'published',
        capacity: 12,
        day: 'Tuesday',
        block: 'Block 1',
        schedule_config: {
          day: 'Wednesday',
          block: 'Block 4',
          recurring: true,
        },
      },
      {
        id: 'published-2',
        name: 'Creative Writing',
        teacher_id: secondTeacher.id,
        status: 'published',
        capacity: 8,
        day: null,
        block: null,
        schedule_config: {
          day: 'Tuesday/Thursday',
          block: 'Block 2',
          recurring: true,
        },
      },
      {
        id: 'draft-1',
        name: 'Draft Class',
        teacher_id: TEACHER_ID,
        status: 'draft',
        capacity: 20,
        day: 'Thursday',
        block: 'Block 3',
        schedule_config: null,
      },
    ];

    const reportEnrollments: SeedEnrollment[] = [
      {
        id: 'enr-confirmed',
        student_id: 'student-a',
        class_id: 'published-1',
        status: 'confirmed',
      },
      {
        id: 'enr-pending',
        student_id: 'student-b',
        class_id: 'published-1',
        status: 'pending',
      },
      {
        id: 'enr-waitlisted',
        student_id: 'student-c',
        class_id: 'published-1',
        status: 'waitlisted',
        waitlist_position: 1,
      },
      {
        id: 'enr-cancelled',
        student_id: 'student-d',
        class_id: 'published-1',
        status: 'cancelled',
      },
      {
        id: 'enr-draft',
        student_id: 'student-e',
        class_id: 'draft-1',
        status: 'confirmed',
      },
    ];

    function seedReport(authUserId: string | null, authProfile?: SeedProfile) {
      const profiles = [
        TEACHER_PROFILE,
        secondTeacher,
        ADMIN_PROFILE,
        superAdminProfile,
        PARENT_PROFILE,
        SCHEDULER_PROFILE,
        studentProfile,
      ];

      return seedFake({
        authUserId,
        data: {
          profiles: [
            ...profiles.filter((p) => p.id !== authProfile?.id),
            ...(authProfile ? [authProfile] : []),
          ] as unknown as Record<string, unknown>[],
          classes: reportClasses as unknown as Record<string, unknown>[],
          enrollments: reportEnrollments as unknown as Record<
            string,
            unknown
          >[],
        },
      });
    }

    it('rejects unauthenticated users', async () => {
      seedReport(null);

      const result = await getAllAacEnrollmentReport();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Not authenticated');
    });

    it.each([
      ['parent', PARENT_PROFILE],
      ['student', studentProfile],
      ['class_scheduler', SCHEDULER_PROFILE],
    ])('rejects %s users', async (_role, profile) => {
      seedReport(profile.id, profile);

      const result = await getAllAacEnrollmentReport();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('Not authorized');
    });

    it.each([
      ['teacher', TEACHER_PROFILE],
      ['admin', ADMIN_PROFILE],
      ['super_admin', superAdminProfile],
    ])('allows %s users', async (_role, profile) => {
      seedReport(profile.id, profile);

      const result = await getAllAacEnrollmentReport();

      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toHaveLength(2);
    });

    it('returns only published classes with enrolled and waitlisted counts', async () => {
      seedReport(TEACHER_ID, TEACHER_PROFILE);

      const result = await getAllAacEnrollmentReport();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.map((row) => row.className)).toEqual([
        'Art Foundations',
        'Creative Writing',
      ]);

      const art = result.data.find(
        (row) => row.className === 'Art Foundations'
      );
      expect(art).toMatchObject({
        capacity: 12,
        enrolledCount: 2,
        waitlistedCount: 1,
      });
    });

    it('uses class day/block first, then schedule_config fallbacks', async () => {
      seedReport(ADMIN_PROFILE.id, ADMIN_PROFILE);

      const result = await getAllAacEnrollmentReport();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(
        result.data.find((row) => row.className === 'Art Foundations')
      ).toMatchObject({
        block: 'Block 1',
        daysOffered: 'Tuesday only',
      });
      expect(
        result.data.find((row) => row.className === 'Creative Writing')
      ).toMatchObject({
        block: 'Block 2',
        daysOffered: 'Tuesday/Thursday',
      });
    });
  });
});
