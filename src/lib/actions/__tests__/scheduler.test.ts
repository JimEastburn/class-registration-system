
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSchedulerStats, getUnscheduledClasses } from '../scheduler';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe('Scheduler Actions', () => {
  let mockBuilder: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      range: vi.fn(),
      single: vi.fn(),
      then: vi.fn(),
    };

    mockBuilder.select.mockReturnValue(mockBuilder);
    mockBuilder.eq.mockReturnValue(mockBuilder);
    mockBuilder.neq.mockReturnValue(mockBuilder);
    mockBuilder.in.mockReturnValue(mockBuilder);
    mockBuilder.order.mockReturnValue(mockBuilder);
    mockBuilder.limit.mockReturnValue(mockBuilder);
    mockBuilder.range.mockReturnValue(mockBuilder);

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue(mockBuilder),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
    (createAdminClient as any).mockResolvedValue(mockSupabase);
  });

  describe('getSchedulerStats', () => {
    it('should return correct stats for admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-123' } } });
      mockBuilder.single.mockResolvedValue({ data: { role: 'admin' } }); // Role check

      // 1. Total Classes query (neq -> await builder)
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ count: 10, error: null }));

      // 2. Unscheduled Classes query (eq -> await builder)
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ count: 3, error: null }));

      // 3. Conflicts (in -> await builder)
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); 

      const result = await getSchedulerStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalClasses).toBe(10);
        expect(result.data.unscheduledCount).toBe(3);
        expect(result.data.conflictCount).toBe(0);
      }
    });

    it('should return unauthorized for parent', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent-123' } } });
        mockBuilder.single.mockResolvedValue({ data: { role: 'parent' } });
  
        const result = await getSchedulerStats();
  
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBe('Unauthorized');
        }
      });
  });

  describe('getUnscheduledClasses', () => {
    it('should return list of draft classes', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-123' } } });
        mockBuilder.single.mockResolvedValue({ data: { role: 'admin' } });

        const mockClasses = [{ id: '1', name: 'Draft Class', status: 'draft' }];
        
        // Mock chain: select -> eq -> order -> limit -> await builder
        mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: mockClasses, error: null }));

        const result = await getUnscheduledClasses(5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Draft Class');
        }
    });
  });
});
