import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getParentDashboardStats,
  getUpcomingClassesForFamily,
  getTeacherDashboardData,
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
    });

    it('should return stats with correct values', async () => {
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

      // Pending payments
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({ data: [{ amount: 10000 }], error: null })
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
        pendingPaymentTotal: 100, // 10000 cents = $100
        upcomingClassCount: 3,
      });
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

    it('should query enrollments with confirmed status', async () => {
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
          data: [{ id: 'class-1', name: 'Test Class', status: 'active' }],
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
  });
});
