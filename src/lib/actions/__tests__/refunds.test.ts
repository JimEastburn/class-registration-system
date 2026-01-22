import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processRefund } from '../refunds';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock Stripe
vi.mock('stripe', () => {
    class MockStripe {
        refunds = {
            create: vi.fn().mockResolvedValue({ id: 'ref_123' }),
        };
    }
    return {
        default: MockStripe,
    };
});

describe('Refunds Server Actions implementation', () => {
    let mockSupabase: any;
    let mockStripe: any;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockUpdate = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();

        const fromObj = {
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
            select: mockSelect,
        };

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => fromObj),
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);

        // Stripe instance is created inside the action, 
        // but we mocked the Stripe class so we can access instances if needed
        // For simplicity, the mock implementation returns a fixed object.
    });

    describe('processRefund', () => {
        it('should return error if not admin', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'parent' } } },
                error: null
            });
            const result = await processRefund('pay123');
            expect(result.error).toContain('Unauthorized');
        });

        it('should return error if payment not found', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await processRefund('pay123');
            expect(result.error).toBe('Payment not found');
        });

        it('should return error if payment is not completed', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null })
            });

            const result = await processRefund('pay123');
            expect(result.error).toContain('Only completed payments');
        });

        it('should process refund, update database, and revalidate', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            // Payment check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'pay123', status: 'completed',
                        stripe_payment_id: 'pi_123', enrollment_id: 'enroll123'
                    },
                    error: null
                })
            });

            // Refund update
            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await processRefund('pay123');

            expect(result).toEqual({ success: true, refundId: 'ref_123' });
            expect(revalidatePath).toHaveBeenCalledWith('/admin/payments');
        });
        it('should return error if payment is already refunded', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'refunded' }, error: null })
            });

            const result = await processRefund('pay123');
            expect(result.error).toBe('Payment has already been refunded');
        });

        it('should return success even if Supabase update fails after Stripe succeeds', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            // Payment check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'pay123', status: 'completed',
                        stripe_payment_id: 'pi_123', enrollment_id: 'enroll123'
                    },
                    error: null
                })
            });

            // Refund update fails in DB
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } })
                })
            });

            const result = await processRefund('pay123');

            // Based on code: // Still return success since Stripe refund went through
            expect(result.success).toBe(true);
            expect(result.refundId).toBe('ref_123');
        });
    });
});
