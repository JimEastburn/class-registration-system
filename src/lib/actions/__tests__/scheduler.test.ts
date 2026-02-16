
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { getSchedulerStats, getUnscheduledClasses } from '../scheduler';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

// Mock scheduling logic (used by getConflictAlerts internally)
vi.mock('@/lib/logic/scheduling', () => ({
    checkScheduleConflict: vi.fn().mockReturnValue(null),
}));

describe('Scheduler Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSchedulerStats', () => {
    it('should return correct stats for class_scheduler', async () => {
      // getSchedulerStats flow:
      // 1. createClient() -> auth check + role='class_scheduler'
      // 2. createAdminClient() -> totalClasses count (neq 'cancelled')
      // 3. createAdminClient() -> unscheduledCount (eq 'draft')
      // 4. getConflictAlerts() internally calls:
      //    4a. createClient() -> auth + role check AGAIN
      //    4b. createAdminClient() -> fetch classes .in('status',...)

      const mockUserClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'scheduler-123' } }, error: null }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'class_scheduler' },
                error: null,
              }),
            }),
          }),
        }),
      };

      // createClient will be called twice (once by getSchedulerStats, once by getConflictAlerts)
      (createClient as Mock)
        .mockResolvedValueOnce(mockUserClient)  // getSchedulerStats auth
        .mockResolvedValueOnce(mockUserClient);  // getConflictAlerts auth

      const adminFromCallCount = { n: 0 };
      const mockAdminClient = {
        from: vi.fn().mockImplementation(() => {
          adminFromCallCount.n++;
          if (adminFromCallCount.n === 1) {
            // Total classes count (neq 'cancelled')
            return {
              select: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ count: 10, error: null }),
              }),
            };
          }
          if (adminFromCallCount.n === 2) {
            // Unscheduled classes count (eq 'draft')
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
              }),
            };
          }
          if (adminFromCallCount.n === 3) {
            // getConflictAlerts: fetch classes .in('status', ...)
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {};
        }),
      };

      (createAdminClient as Mock)
        .mockResolvedValueOnce(mockAdminClient)  // getSchedulerStats admin
        .mockResolvedValueOnce(mockAdminClient);  // getConflictAlerts admin

      const result = await getSchedulerStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalClasses).toBe(10);
        expect(result.data.unscheduledCount).toBe(3);
        expect(result.data.conflictCount).toBe(0);
      }
    });

    it('should return unauthorized for parent', async () => {
        const mockUserClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'parent-123' } }, error: null }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'parent' },
                  error: null,
                }),
              }),
            }),
          }),
        };

        (createClient as Mock).mockResolvedValue(mockUserClient);
  
        const result = await getSchedulerStats();
  
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Unauthorized');
        }
      });
  });

  describe('getUnscheduledClasses', () => {
    it('should return list of draft classes', async () => {
        // getUnscheduledClasses flow:
        // 1. createClient() -> auth + role='class_scheduler'
        // 2. createAdminClient() -> fetch classes eq('status','draft').order().limit()

        const mockUserClient = {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'scheduler-123' } }, error: null }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'class_scheduler' },
                  error: null,
                }),
              }),
            }),
          }),
        };

        const mockClasses = [{ id: '1', name: 'Draft Class', status: 'draft' }];

        const mockAdminClient = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: mockClasses, error: null }),
                }),
              }),
            }),
          }),
        };

        (createClient as Mock).mockResolvedValue(mockUserClient);
        (createAdminClient as Mock).mockResolvedValue(mockAdminClient);

        const result = await getUnscheduledClasses(5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Draft Class');
        }
    });
  });
});
