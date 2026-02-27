import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getParentDashboardStats,
  getUpcomingClassesForFamily,
  getRecentPayments,
  getTeacherDashboardData,
  getPendingEnrollments,
} from '../dashboard';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Dashboard Actions', () => {
  let mockBuilder: ReturnType<typeof createMockBuilder>;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  function createMockBuilder() {
    const builder: any = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      gte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      single: vi.fn(),
      then: vi.fn(),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    builder.gte.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);

    return builder;
  }

  function createMockSupabase() {
    return {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockBuilder = createMockBuilder();
    mockSupabase = createMockSupabase();
    mockSupabase.from.mockReturnValue(mockBuilder);
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('getParentDashboardStats', () => {
    it('should return error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getParentDashboardStats();

      expect(result.error).toBe('Not authenticated');
      expect(result.data).toBeNull();
    });

    it('should query enrollments with confirmed status for active enrollment count', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family member count query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 2, error: null })
      );

      // Family members query for IDs
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'fm-1' }, { id: 'fm-2' }], error: null })
      );

      // Active enrollment count - THIS IS THE KEY TEST
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 3, error: null })
      );

      // Pending payments query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      // Upcoming classes count
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 1, error: null })
      );

      await getParentDashboardStats();

      // Verify the enrollment query used 'confirmed' status
      expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'confirmed');
      // Verify the enrollment query used the correct column name 'student_id'
      expect(mockBuilder.in).toHaveBeenCalledWith('student_id', [
        'fm-1',
        'fm-2',
      ]);
    });

    it('should return stats with correct values — amounts in dollars, not cents', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family member count
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 2, error: null })
      );

      // Family members data
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'fm-1' }], error: null })
      );

      // Active enrollment count
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 5, error: null })
      );

      // Pending payments — DB stores amount in DOLLARS (e.g., 30 = $30)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ amount: 30 }], error: null })
      );

      // Upcoming classes
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 3, error: null })
      );

      const result = await getParentDashboardStats();

      expect(result.error).toBeNull();
      expect(result.data).toEqual({
        familyMemberCount: 2,
        activeEnrollmentCount: 5,
        pendingPaymentTotal: 30, // $30 — NOT divided by 100
        upcomingClassCount: 3,
      });
    });

    it('should NOT divide pendingPaymentTotal by 100', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 1, error: null })
      );
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'fm-1' }], error: null })
      );
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 0, error: null })
      );
      // Two payments of $30 each
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ amount: 30 }, { amount: 30 }], error: null })
      );
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ count: 0, error: null })
      );

      const result = await getParentDashboardStats();

      // Should be $60, not $0.60
      expect(result.data?.pendingPaymentTotal).toBe(60);
      expect(result.data?.pendingPaymentTotal).not.toBe(0.6);
    });
  });

  describe('getUpcomingClassesForFamily', () => {
    it('should return empty array when no family members', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      const result = await getUpcomingClassesForFamily(5);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should query enrollments with confirmed status and correct column name', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family members query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'fm-1', first_name: 'John', last_name: 'Doe' }],
          error: null,
        })
      );

      // Enrollments query with class details
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      await getUpcomingClassesForFamily(5);

      // Verify the enrollment query used 'confirmed' status
      expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'confirmed');
      // Verify the enrollment query used the correct column name 'student_id'
      expect(mockBuilder.in).toHaveBeenCalledWith('student_id', ['fm-1']);
    });

    it('should return objects with block and dayOfWeek — not startTime/endTime', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family members query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'fm-1', first_name: 'Alice', last_name: 'Smith' }],
          error: null,
        })
      );

      // Enrollments query with class details using day/block columns
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'enr-1',
              student_id: 'fm-1',
              classes: {
                id: 'class-1',
                name: 'Art 101',
                day: 'Thursday',
                block: 'Block 4',
                profiles: { first_name: 'Jane', last_name: 'Teacher' },
              },
            },
          ],
          error: null,
        })
      );

      const result = await getUpcomingClassesForFamily(5);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);

      const cls = result.data![0];
      // System uses blocks, not clock times
      expect(cls.block).toBe('Block 4');
      expect(cls.dayOfWeek).toBe('Thursday');
      expect(cls.className).toBe('Art 101');
      expect(cls.teacherName).toBe('Jane Teacher');
      expect(cls.familyMemberName).toBe('Alice Smith');
      // Ensure old time-based properties don't exist
      expect(cls).not.toHaveProperty('startTime');
      expect(cls).not.toHaveProperty('endTime');
    });

    it('should default block and dayOfWeek to TBA when null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'fm-1', first_name: 'Bob', last_name: 'Jones' }],
          error: null,
        })
      );

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'enr-1',
              student_id: 'fm-1',
              classes: {
                id: 'class-2',
                name: 'Music 101',
                day: null,
                block: null,
                profiles: null,
              },
            },
          ],
          error: null,
        })
      );

      const result = await getUpcomingClassesForFamily(5);

      const cls = result.data![0];
      expect(cls.dayOfWeek).toBe('TBA');
      expect(cls.block).toBe('TBA');
      expect(cls.teacherName).toBe('TBD');
    });
  });

  describe('getRecentPayments', () => {
    it('should return payment amounts in dollars without dividing by 100', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family members
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'fm-1' }], error: null })
      );

      // Enrollments for family members
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ id: 'enr-1' }], error: null })
      );

      // Payments — DB stores amount as 30 (dollars)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'pay-1',
              amount: 30,
              status: 'completed',
              created_at: '2024-01-01',
            },
          ],
          error: null,
        })
      );

      const result = await getRecentPayments(3);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].amount).toBe(30); // $30.00, not $0.30
      expect(result.data![0].amount).not.toBe(0.3); // Regression: was dividing by 100
    });

    it('should return empty array when no enrollments', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // No family members
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      const result = await getRecentPayments(3);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getPendingEnrollments', () => {
    it('should return empty array when no family members', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      const result = await getPendingEnrollments();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should query enrollments with pending status and correct column name', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family members query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'fm-1', first_name: 'Jane', last_name: 'Doe' }],
          error: null,
        })
      );

      // Pending enrollments query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      await getPendingEnrollments();

      // Verify the enrollment query used 'pending' status
      expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'pending');
      // Verify the enrollment query used the correct column name 'student_id'
      expect(mockBuilder.in).toHaveBeenCalledWith('student_id', ['fm-1']);
    });

    it('should return amountDue in dollars — classes.price is already in dollars', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });

      // Family members
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'fm-1', first_name: 'Jane', last_name: 'Doe' }],
          error: null,
        })
      );

      // Pending enrollments — DB stores price in DOLLARS (30 = $30)
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'enr-1',
              student_id: 'fm-1',
              classes: { name: 'Art 101', price: 30 },
            },
          ],
          error: null,
        })
      );

      const result = await getPendingEnrollments();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].amountDue).toBe(30); // $30 — already dollars, no conversion
      expect(result.data![0].amountDue).not.toBe(0.3); // Must NOT divide by 100
    });
  });

  describe('getTeacherDashboardData', () => {
    it('should return unauthorized for parent role', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'parent-123' } },
      });
      mockBuilder.single.mockResolvedValue({ data: { role: 'parent' } });

      const result = await getTeacherDashboardData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authorized');
    });

    it('should query enrollment counts with confirmed status for teachers', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'teacher-123' } },
      });
      mockBuilder.single.mockResolvedValue({ data: { role: 'teacher' } });

      // Classes query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: 'class-1', name: 'Test Class', status: 'published' }],
          error: null,
        })
      );

      // Enrollment counts query - THIS IS THE KEY TEST
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      // Recent enrollments query
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      await getTeacherDashboardData();

      // Verify the enrollment query used 'confirmed' status
      expect(mockBuilder.eq).toHaveBeenCalledWith('status', 'confirmed');
    });

    it('should return todayClasses with block property — not startTime/endTime', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'teacher-123' } },
      });
      mockBuilder.single.mockResolvedValue({ data: { role: 'teacher' } });

      // Use today's day name so the class matches the "today" filter
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const todayDay = dayNames[new Date().getDay()];

      // Classes query — class scheduled for today with block
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'class-1',
              name: 'Math 201',
              status: 'published',
              capacity: 20,
              day: todayDay,
              block: 'Block 3',
              schedule_config: {
                day: todayDay,
                block: 'Block 3',
                recurring: true,
              },
            },
          ],
          error: null,
        })
      );

      // Enrollment counts
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ class_id: 'class-1' }], error: null })
      );

      // Recent enrollments
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      const result = await getTeacherDashboardData();

      expect(result.success).toBe(true);
      expect(result.data!.todayClasses).toHaveLength(1);

      const todayClass = result.data!.todayClasses[0];
      // System uses blocks, not clock times
      expect(todayClass.block).toBe('Block 3');
      expect(todayClass.name).toBe('Math 201');
      expect(todayClass.enrolledCount).toBe(1);
      expect(todayClass.capacity).toBe(20);
      // Ensure old time-based properties don't exist
      expect(todayClass).not.toHaveProperty('startTime');
      expect(todayClass).not.toHaveProperty('endTime');
    });

    it('should default block to TBA when not set', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'teacher-123' } },
      });
      mockBuilder.single.mockResolvedValue({ data: { role: 'teacher' } });

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const todayDay = dayNames[new Date().getDay()];

      // Class with no block set
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [
            {
              id: 'class-2',
              name: 'Unscheduled Class',
              status: 'published',
              capacity: 15,
              day: todayDay,
              block: null,
              schedule_config: null,
            },
          ],
          error: null,
        })
      );

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [], error: null })
      );

      const result = await getTeacherDashboardData();

      expect(result.data!.todayClasses[0].block).toBe('TBA');
    });
  });
});
