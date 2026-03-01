import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getParentDashboardStats,
  getUpcomingClassesForFamily,
  getRecentPayments,
  getTeacherDashboardData,
  getPendingEnrollments,
} from '../dashboard';
import {
  seedFake,
  TEACHER_PROFILE,
  type SeedFamilyMember,
  type SeedEnrollment,
  type SeedPayment,
  type SeedClass,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const PARENT_ID = 'parent-123';

const familyMembers: SeedFamilyMember[] = [
  { id: 'fm-1', parent_id: PARENT_ID, first_name: 'Alice', last_name: 'Smith', email: '', relationship: 'Student' },
  { id: 'fm-2', parent_id: PARENT_ID, first_name: 'Bob', last_name: 'Smith', email: '', relationship: 'Student' },
];

const classes: SeedClass[] = [
  { id: 'class-1', name: 'Art 101', teacher_id: 'teacher-123', status: 'published', price: 30, capacity: 20, day: 'Monday', block: 'Block 1', start_date: '2026-03-01', schedule_config: { day: 'Monday', block: 'Block 1', recurring: true } },
  { id: 'class-2', name: 'Music 201', teacher_id: 'teacher-123', status: 'published', price: 50, capacity: 15, day: 'Tuesday', block: 'Block 2', start_date: '2026-04-01', schedule_config: { day: 'Tuesday', block: 'Block 2', recurring: true } },
  { id: 'class-3', name: 'Draft Class', teacher_id: 'teacher-123', status: 'draft', price: 25, capacity: 10, day: null, block: null, start_date: null, schedule_config: null },
];

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: PARENT_ID,
    data: {
      family_members: familyMembers as unknown as Record<string, unknown>[],
      profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
      classes: classes as unknown as Record<string, unknown>[],
      enrollments: [],
      payments: [],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Dashboard Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getParentDashboardStats', () => {
    it('should return error when not authenticated', async () => {
      seedFake({ authUserId: null });
      const result = await getParentDashboardStats();
      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeNull();
    });

    it('should return correct stats with family member names', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'confirmed' },
        { id: 'enr-3', student_id: 'fm-2', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-4', student_id: 'fm-2', class_id: 'class-2', status: 'pending' },
      ];
      const payments: SeedPayment[] = [
        { id: 'pay-1', parent_id: PARENT_ID, amount: 30, status: 'pending' },
      ];
      seed({
        enrollments: enrollments as unknown as Record<string, unknown>[],
        payments: payments as unknown as Record<string, unknown>[],
      });

      const result = await getParentDashboardStats();
      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        familyMemberCount: 2,
        familyMemberNames: ['Alice Smith', 'Bob Smith'],
        activeEnrollmentCount: 3,
        pendingPaymentTotal: 30,
      });
    });

    it('should only count confirmed enrollments — not pending or cancelled', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'pending' },
        { id: 'enr-3', student_id: 'fm-2', class_id: 'class-1', status: 'cancelled' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getParentDashboardStats();
      expect(result.data?.activeEnrollmentCount).toBe(1);
    });

    it('should return pendingPaymentTotal in dollars — not divided by 100', async () => {
      const payments: SeedPayment[] = [
        { id: 'pay-1', parent_id: PARENT_ID, amount: 30, status: 'pending' },
        { id: 'pay-2', parent_id: PARENT_ID, amount: 30, status: 'pending' },
      ];
      seed({ payments: payments as unknown as Record<string, unknown>[] });
      const result = await getParentDashboardStats();
      expect(result.data?.pendingPaymentTotal).toBe(60);
      expect(result.data?.pendingPaymentTotal).not.toBe(0.6);
    });
  });

  describe('getUpcomingClassesForFamily', () => {
    it('should return empty array when no family members', async () => {
      seed({ family_members: [] });
      const result = await getUpcomingClassesForFamily(5);
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should return class details with block and dayOfWeek', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getUpcomingClassesForFamily(5);
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      const cls = result.data![0];
      expect(cls.block).toBe('Block 1');
      expect(cls.dayOfWeek).toBe('Monday');
      expect(cls.className).toBe('Art 101');
      expect(cls.teacherName).toBe('Teacher Smith');
      expect(cls.familyMemberName).toBe('Alice Smith');
      expect(cls).not.toHaveProperty('startTime');
    });

    it('should only return confirmed enrollments', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-2', class_id: 'class-2', status: 'pending' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getUpcomingClassesForFamily(5);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].className).toBe('Art 101');
    });

    it('should default block and dayOfWeek to TBA when null', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-3', status: 'confirmed' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getUpcomingClassesForFamily(5);
      const cls = result.data![0];
      expect(cls.dayOfWeek).toBe('TBA');
      expect(cls.block).toBe('TBA');
    });
  });

  describe('getRecentPayments', () => {
    it('should return payment amounts in dollars without dividing by 100', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
      ];
      const payments: SeedPayment[] = [
        { id: 'pay-1', enrollment_id: 'enr-1', parent_id: PARENT_ID, amount: 30, status: 'completed', created_at: '2024-01-01' },
      ];
      seed({
        enrollments: enrollments as unknown as Record<string, unknown>[],
        payments: payments as unknown as Record<string, unknown>[],
      });
      const result = await getRecentPayments(3);
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].amount).toBe(30);
      expect(result.data![0].amount).not.toBe(0.3);
    });

    it('should return empty array when no enrollments', async () => {
      seed({ family_members: [] });
      const result = await getRecentPayments(3);
      expect(result.data).toEqual([]);
    });
  });

  describe('getPendingEnrollments', () => {
    it('should return empty array when no family members', async () => {
      seed({ family_members: [] });
      const result = await getPendingEnrollments();
      expect(result.data).toEqual([]);
    });

    it('should only return pending enrollments', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'pending' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'confirmed' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getPendingEnrollments();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].className).toBe('Art 101');
    });

    it('should return amountDue in dollars — classes.price is already in dollars', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'pending' },
      ];
      seed({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getPendingEnrollments();
      expect(result.data![0].amountDue).toBe(30);
      expect(result.data![0].amountDue).not.toBe(0.3);
    });
  });

  describe('getTeacherDashboardData', () => {
    function seedTeacher(overrides: Record<string, Record<string, unknown>[]> = {}) {
      return seedFake({
        authUserId: 'teacher-123',
        data: {
          profiles: [TEACHER_PROFILE] as unknown as Record<string, unknown>[],
          classes: classes as unknown as Record<string, unknown>[],
          enrollments: [],
          family_members: familyMembers as unknown as Record<string, unknown>[],
          ...overrides,
        },
      });
    }

    it('should return unauthorized for parent role', async () => {
      seedFake({
        authUserId: 'parent-user',
        data: { profiles: [{ id: 'parent-user', first_name: 'Parent', last_name: 'User', role: 'parent' }] },
      });
      const result = await getTeacherDashboardData();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    it('should only count confirmed enrollments for student totals', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-2', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-3', student_id: 'fm-1', class_id: 'class-2', status: 'pending' },
      ];
      seedTeacher({ enrollments: enrollments as unknown as Record<string, unknown>[] });
      const result = await getTeacherDashboardData();
      expect(result.success).toBe(true);
      expect(result.data!.stats.totalStudents).toBe(2);
    });

    it('should return todayClasses with block property — not startTime/endTime', async () => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[new Date().getDay()];
      const todayClass: SeedClass = {
        id: 'class-today', name: 'Today Art', teacher_id: 'teacher-123',
        status: 'published', capacity: 20, day: todayDay, block: 'Block 3',
        schedule_config: { day: todayDay, block: 'Block 3', recurring: true },
      };
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-today', status: 'confirmed' },
      ];
      seedTeacher({
        classes: [todayClass] as unknown as Record<string, unknown>[],
        enrollments: enrollments as unknown as Record<string, unknown>[],
      });
      const result = await getTeacherDashboardData();
      expect(result.success).toBe(true);
      expect(result.data!.todayClasses).toHaveLength(1);
      const cls = result.data!.todayClasses[0];
      expect(cls.block).toBe('Block 3');
      expect(cls.name).toBe('Today Art');
      expect(cls.enrolledCount).toBe(1);
      expect(cls.capacity).toBe(20);
      expect(cls).not.toHaveProperty('startTime');
    });

    it('should default block to TBA when not set', async () => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[new Date().getDay()];
      const noBlockClass: SeedClass = {
        id: 'class-no-block', name: 'Unscheduled', teacher_id: 'teacher-123',
        status: 'published', capacity: 15, day: todayDay, block: null, schedule_config: null,
      };
      seedTeacher({
        classes: [noBlockClass] as unknown as Record<string, unknown>[],
      });
      const result = await getTeacherDashboardData();
      expect(result.data!.todayClasses[0].block).toBe('TBA');
    });
  });
});
