import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getParentDashboardStats,
  getUpcomingClassesForFamily,
  getRecentPayments,
  getTeacherDashboardData,
  getPendingEnrollments,
} from '../dashboard';
import { createClient } from '@/lib/supabase/server';
import { SupabaseFake } from '@/__integration__/fakes/supabase';
import type { FamilyMember, Enrollment, Payment, Profile } from '@/types';

// Mock the supabase server client to return our fake
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

// ─── Typed seed-data helpers ────────────────────────────────────────────────

type SeedFamilyMember = Pick<FamilyMember, 'id' | 'parent_id' | 'first_name' | 'last_name'>;
type SeedEnrollment = Pick<Enrollment, 'id' | 'student_id' | 'class_id' | 'status'> & { created_at?: string };
type SeedPayment = Pick<Payment, 'id' | 'amount' | 'status'> & { parent_id: string; enrollment_id?: string; created_at?: string };
type SeedProfile = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'role'>;

interface SeedClass {
  id: string;
  name: string;
  price: number;
  teacher_id: string;
  status: string;
  capacity?: number;
  day?: string | null;
  block?: string | null;
  start_date?: string | null;
  schedule_config?: Record<string, unknown> | null;
}

// ─── Shared seed data ───────────────────────────────────────────────────────

const PARENT_ID = 'parent-123';

const familyMembers: SeedFamilyMember[] = [
  { id: 'fm-1', parent_id: PARENT_ID, first_name: 'Alice', last_name: 'Smith' },
  { id: 'fm-2', parent_id: PARENT_ID, first_name: 'Bob', last_name: 'Smith' },
];

const teacher: SeedProfile = {
  id: 'teacher-1', first_name: 'Jane', last_name: 'Teacher', role: 'teacher',
};

const classes: SeedClass[] = [
  { id: 'class-1', name: 'Art 101', price: 30, teacher_id: 'teacher-1', status: 'published', capacity: 20, day: 'Monday', block: 'Block 1', start_date: '2026-03-01', schedule_config: { day: 'Monday', block: 'Block 1', recurring: true } },
  { id: 'class-2', name: 'Music 201', price: 50, teacher_id: 'teacher-1', status: 'published', capacity: 15, day: 'Tuesday', block: 'Block 2', start_date: '2026-04-01', schedule_config: { day: 'Tuesday', block: 'Block 2', recurring: true } },
  { id: 'class-3', name: 'Draft Class', price: 25, teacher_id: 'teacher-1', status: 'draft', capacity: 10, day: null, block: null, start_date: null, schedule_config: null },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Dashboard Actions', () => {
  let fake: SupabaseFake;

  function seedFake(overrides: Record<string, Record<string, unknown>[]> = {}) {
    fake = new SupabaseFake({
      family_members: familyMembers as unknown as Record<string, unknown>[],
      profiles: [teacher] as unknown as Record<string, unknown>[],
      classes: classes as unknown as Record<string, unknown>[],
      enrollments: [],
      payments: [],
      ...overrides,
    });
    fake.setAuthUser({ id: PARENT_ID });
    mockedCreateClient.mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getParentDashboardStats
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getParentDashboardStats', () => {
    it('should return error when not authenticated', async () => {
      fake = new SupabaseFake();
      // Don't set auth user
      mockedCreateClient.mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getParentDashboardStats();
      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeNull();
    });

    it('should return correct stats with family member names', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'confirmed' },
        { id: 'enr-3', student_id: 'fm-2', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-4', student_id: 'fm-2', class_id: 'class-2', status: 'pending' }, // should NOT count
      ];
      const payments: SeedPayment[] = [
        { id: 'pay-1', parent_id: PARENT_ID, amount: 30, status: 'pending' },
      ];
      seedFake({
        enrollments: enrollments as unknown as Record<string, unknown>[],
        payments: payments as unknown as Record<string, unknown>[],
      });

      const result = await getParentDashboardStats();

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        familyMemberCount: 2,
        familyMemberNames: ['Alice Smith', 'Bob Smith'],
        activeEnrollmentCount: 3, // only confirmed
        pendingPaymentTotal: 30,
      });
    });

    it('should only count confirmed enrollments — not pending or cancelled', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'pending' },
        { id: 'enr-3', student_id: 'fm-2', class_id: 'class-1', status: 'cancelled' },
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getParentDashboardStats();

      expect(result.data?.activeEnrollmentCount).toBe(1);
    });

    it('should return pendingPaymentTotal in dollars — not divided by 100', async () => {
      const payments: SeedPayment[] = [
        { id: 'pay-1', parent_id: PARENT_ID, amount: 30, status: 'pending' },
        { id: 'pay-2', parent_id: PARENT_ID, amount: 30, status: 'pending' },
      ];
      seedFake({ payments: payments as unknown as Record<string, unknown>[] });

      const result = await getParentDashboardStats();

      expect(result.data?.pendingPaymentTotal).toBe(60); // $60, not $0.60
      expect(result.data?.pendingPaymentTotal).not.toBe(0.6);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getUpcomingClassesForFamily
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getUpcomingClassesForFamily', () => {
    it('should return empty array when no family members', async () => {
      seedFake({ family_members: [] });

      const result = await getUpcomingClassesForFamily(5);
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should return class details with block and dayOfWeek', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getUpcomingClassesForFamily(5);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);

      const cls = result.data![0];
      expect(cls.block).toBe('Block 1');
      expect(cls.dayOfWeek).toBe('Monday');
      expect(cls.className).toBe('Art 101');
      expect(cls.teacherName).toBe('Jane Teacher');
      expect(cls.familyMemberName).toBe('Alice Smith');
      // System uses blocks, not clock times
      expect(cls).not.toHaveProperty('startTime');
      expect(cls).not.toHaveProperty('endTime');
    });

    it('should only return confirmed enrollments', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-2', class_id: 'class-2', status: 'pending' }, // should NOT appear
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getUpcomingClassesForFamily(5);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].className).toBe('Art 101');
    });

    it('should default block and dayOfWeek to TBA when null', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-3', status: 'confirmed' },
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getUpcomingClassesForFamily(5);

      const cls = result.data![0];
      expect(cls.dayOfWeek).toBe('TBA');
      expect(cls.block).toBe('TBA');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getRecentPayments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getRecentPayments', () => {
    it('should return payment amounts in dollars without dividing by 100', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
      ];
      const payments: SeedPayment[] = [
        { id: 'pay-1', enrollment_id: 'enr-1', parent_id: PARENT_ID, amount: 30, status: 'completed', created_at: '2024-01-01' },
      ];
      seedFake({
        enrollments: enrollments as unknown as Record<string, unknown>[],
        payments: payments as unknown as Record<string, unknown>[],
      });

      const result = await getRecentPayments(3);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].amount).toBe(30); // $30, not $0.30
      expect(result.data![0].amount).not.toBe(0.3);
    });

    it('should return empty array when no enrollments', async () => {
      seedFake({ family_members: [] });

      const result = await getRecentPayments(3);
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getPendingEnrollments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPendingEnrollments', () => {
    it('should return empty array when no family members', async () => {
      seedFake({ family_members: [] });

      const result = await getPendingEnrollments();
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should only return pending enrollments', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'pending' },
        { id: 'enr-2', student_id: 'fm-1', class_id: 'class-2', status: 'confirmed' }, // should NOT appear
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getPendingEnrollments();

      expect(result.data).toHaveLength(1);
      expect(result.data![0].className).toBe('Art 101');
    });

    it('should return amountDue in dollars — classes.price is already in dollars', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'pending' },
      ];
      seedFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getPendingEnrollments();

      expect(result.error).toBeNull();
      expect(result.data![0].amountDue).toBe(30); // $30, not $0.30
      expect(result.data![0].amountDue).not.toBe(0.3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getTeacherDashboardData
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTeacherDashboardData', () => {
    function seedTeacherFake(overrides: Record<string, Record<string, unknown>[]> = {}) {
      fake = new SupabaseFake({
        profiles: [teacher] as unknown as Record<string, unknown>[],
        classes: classes as unknown as Record<string, unknown>[],
        enrollments: [],
        family_members: familyMembers as unknown as Record<string, unknown>[],
        ...overrides,
      });
      fake.setAuthUser({ id: 'teacher-1' });
      mockedCreateClient.mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);
    }

    it('should return unauthorized for parent role', async () => {
      fake = new SupabaseFake({
        profiles: [{ id: 'parent-user', first_name: 'Parent', last_name: 'User', role: 'parent' }],
      });
      fake.setAuthUser({ id: 'parent-user' });
      mockedCreateClient.mockResolvedValue(fake as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getTeacherDashboardData();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    it('should only count confirmed enrollments for student totals', async () => {
      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-2', student_id: 'fm-2', class_id: 'class-1', status: 'confirmed' },
        { id: 'enr-3', student_id: 'fm-1', class_id: 'class-2', status: 'pending' }, // should NOT count
      ];
      seedTeacherFake({ enrollments: enrollments as unknown as Record<string, unknown>[] });

      const result = await getTeacherDashboardData();

      expect(result.success).toBe(true);
      expect(result.data!.stats.totalStudents).toBe(2); // only confirmed
    });

    it('should return todayClasses with block property — not startTime/endTime', async () => {
      // Dynamically set a class to today's day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[new Date().getDay()];

      const todayClass: SeedClass = {
        id: 'class-today', name: 'Today Art', price: 30, teacher_id: 'teacher-1',
        status: 'published', capacity: 20, day: todayDay, block: 'Block 3',
        schedule_config: { day: todayDay, block: 'Block 3', recurring: true },
      };

      const enrollments: SeedEnrollment[] = [
        { id: 'enr-1', student_id: 'fm-1', class_id: 'class-today', status: 'confirmed' },
      ];

      seedTeacherFake({
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
      expect(cls).not.toHaveProperty('endTime');
    });

    it('should default block to TBA when not set', async () => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = dayNames[new Date().getDay()];

      const noBlockClass: SeedClass = {
        id: 'class-no-block', name: 'Unscheduled', price: 30, teacher_id: 'teacher-1',
        status: 'published', capacity: 15, day: todayDay, block: null,
        schedule_config: null,
      };

      seedTeacherFake({
        classes: [noBlockClass] as unknown as Record<string, unknown>[],
      });

      const result = await getTeacherDashboardData();
      expect(result.data!.todayClasses[0].block).toBe('TBA');
    });
  });
});
