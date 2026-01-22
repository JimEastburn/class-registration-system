import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '@/app/api/webhooks/stripe/route';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPaymentReceipt } from '@/lib/email';
import { syncPaymentToZoho } from '@/lib/zoho';
import { headers } from 'next/headers';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
    sendPaymentReceipt: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/zoho', () => ({
    syncPaymentToZoho: vi.fn().mockImplementation(() => Promise.resolve({ success: true })),
}));

describe('Webhook Idempotency & Fault Tolerance Integration', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        const createBuilder = (status = 'pending') => {
            const builder: any = {
                select: vi.fn().mockImplementation(() => builder),
                update: vi.fn().mockImplementation(() => builder),
                eq: vi.fn().mockImplementation(() => builder),
                single: vi.fn().mockImplementation(() => {
                    return Promise.resolve({
                        data: {
                            id: 'pay_123',
                            status,
                            student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent_123' },
                            class: { name: 'Art 101', fee: 150 }
                        },
                        error: null
                    });
                }),
                insert: vi.fn().mockReturnThis(),
            };
            return builder;
        };

        mockSupabase = {
            from: vi.fn().mockImplementation(() => createBuilder('pending')),
        };

        (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it('should ignore duplicate checkout.session.completed events', async () => {
        const mockSessionId = 'cs_test_123';
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: mockSessionId,
                    metadata: { enrollmentId: 'enroll_123' },
                },
            },
        };

        (headers as Mock).mockResolvedValue({
            get: vi.fn().mockReturnValue('valid_signature'),
        });
        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);

        // First call: Process normally
        const request1 = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST', body: JSON.stringify(mockEvent),
        });
        await POST(request1);

        // Second call: Mock payment already completed
        const completedBuilder: any = {
            select: vi.fn().mockImplementation(() => completedBuilder),
            update: vi.fn().mockImplementation(() => completedBuilder),
            eq: vi.fn().mockImplementation(() => completedBuilder),
            single: vi.fn().mockImplementation(() => {
                return Promise.resolve({
                    data: {
                        id: 'pay_123',
                        status: 'completed',
                        student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent_123' },
                        class: { name: 'Art 101', fee: 150 }
                    },
                    error: null
                });
            }),
        };

        // We need to return the profile too
        const profileBuilder: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { first_name: 'John', email: 'john@example.com' }, error: null
            }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'profiles') return profileBuilder;
            return completedBuilder;
        });

        const request2 = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST', body: JSON.stringify(mockEvent),
        });
        await POST(request2);

        // Verify side effects were only triggered ONCE
        expect(syncPaymentToZoho).toHaveBeenCalledTimes(1);
        expect(sendPaymentReceipt).toHaveBeenCalledTimes(1);
    });

    it('should handle Zoho sync failure gracefully without affecting internal registration', async () => {
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_fault_123',
                    metadata: { enrollmentId: 'enroll_123' },
                },
            },
        };

        (headers as Mock).mockResolvedValue({ get: vi.fn().mockReturnValue('valid_signature') });
        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);

        // Simulate Zoho failure
        (syncPaymentToZoho as Mock).mockRejectedValue(new Error('Zoho Offline'));

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST', body: JSON.stringify(mockEvent),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('payments');
        expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
    });
});
