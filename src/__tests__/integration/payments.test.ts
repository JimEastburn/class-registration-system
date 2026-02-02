
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPayments, updatePaymentStatus } from '@/lib/actions/payments';

// Mock Supabase
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => ({
        auth: { getUser: mockGetUser },
        from: mockFrom
    }))
}));

describe('getAllPayments Action', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should deny access if not authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });
        const result = await getAllPayments();
        expect(result.error).toBe('Not authenticated');
    });

    it('should deny access if user is not admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user_123' } } });
        // Mock profile check
        mockFrom.mockReturnValueOnce({ // For profiles check
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'parent' } })
        });

        const result = await getAllPayments();
        expect(result.error).toBe('Access denied: Admin privileges required');
    });

    it('should fetch payments if user is admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin_123' } } });
        
        // Mock profile queries and payment queries
        const mockProfileQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' } })
        };
        
        const mockPaymentsQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ 
                data: [{ id: 'pay_1' }], 
                count: 1, 
                error: null 
            })
        };

        mockFrom.mockImplementation((table) => {
            if (table === 'profiles') return mockProfileQuery;
            if (table === 'payments') return mockPaymentsQuery;
            return {};
        });

        const result = await getAllPayments();
        
        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(1);
        expect(mockFrom).toHaveBeenCalledWith('payments');
    });

    it('should apply filters correctly', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin_123' } } });
        
         mockFrom.mockImplementation((table) => {
             if (table === 'profiles') return {
                 select: vi.fn().mockReturnThis(),
                 eq: vi.fn().mockReturnThis(),
                 single: vi.fn().mockResolvedValue({ data: { role: 'admin' } })
             };
             if (table === 'payments') return {
                 select: vi.fn().mockReturnThis(),
                 eq: mockEq.mockReturnThis(),
                 gte: mockGte.mockReturnThis(),
                 lte: mockLte.mockReturnThis(),
                 order: vi.fn().mockReturnThis(),
                 range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null })
             };
             return {};
         });
         
         await getAllPayments({ 
             status: 'completed', 
             startDate: '2023-01-01', 
             endDate: '2023-01-31' 
         });

         expect(mockEq).toHaveBeenCalledWith('status', 'completed');
         expect(mockGte).toHaveBeenCalledWith('created_at', '2023-01-01');
         expect(mockLte).toHaveBeenCalledWith('created_at', '2023-01-31');

    });

    describe('updatePaymentStatus Action', () => {
        it('should deny access if not authenticated', async () => {
            mockGetUser.mockResolvedValueOnce({ data: { user: null } });
            const result = await updatePaymentStatus('pay_1', 'completed');
            expect(result.error).toBe('Not authenticated');
        });

        it('should deny access if not admin', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'user_123' } } });
            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { role: 'parent' } })
            });

            const result = await updatePaymentStatus('pay_1', 'completed');
            expect(result.error).toBe('Access denied: Admin privileges required');
        });

        it('should update payment status successfully', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin_123' } } });
            
            mockFrom.mockImplementation((table) => {
                if (table === 'profiles') return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { role: 'admin' } })
                };
                if (table === 'payments') return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: 'pay_1', status: 'pending', enrollment_id: 'enr_1' } }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null })
                    })
                };
                return {};
            });

            const result = await updatePaymentStatus('pay_1', 'failed');
            expect(result.success).toBe(true);
        });

        it('should confirm enrollment if payment completed', async () => {
            mockGetUser.mockResolvedValue({ data: { user: { id: 'admin_123' } } });

            const mockEnrollmentUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            });

            mockFrom.mockImplementation((table) => {
                if (table === 'profiles') return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { role: 'admin' } })
                };
                if (table === 'payments') return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: 'pay_1', status: 'pending', enrollment_id: 'enr_1' } }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ error: null })
                    })
                };
                if (table === 'enrollments') return {
                    update: mockEnrollmentUpdate
                };
                return {};
            });

            const result = await updatePaymentStatus('pay_1', 'completed');
            expect(result.success).toBe(true);
            expect(mockEnrollmentUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
        });
    });
});
