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

describe('Happy Path: Registration Pipeline Integration', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        const createQueryBuilder = (config: Record<string, any> = {}) => {
            const builder: any = {
                select: vi.fn().mockImplementation(() => builder),
                update: vi.fn().mockImplementation(() => builder),
                eq: vi.fn().mockImplementation(() => builder),
                single: vi.fn().mockImplementation(() => {
                    const result = config.singleData || { data: null, error: null };
                    return Promise.resolve(result);
                }),
                insert: vi.fn().mockImplementation(() => builder),
            };
            return builder;
        };

        mockSupabase = {
            from: vi.fn().mockImplementation((table) => {
                if (table === 'payments') {
                    return createQueryBuilder({ singleData: { data: { id: 'pay_123' }, error: null } });
                }
                if (table === 'enrollments') {
                    const mockEnrollment = {
                        student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent_123' },
                        class: { name: 'Art 101', fee: 150 }
                    };
                    return createQueryBuilder({ singleData: { data: mockEnrollment, error: null } });
                }
                if (table === 'profiles') {
                    const mockParent = { first_name: 'John', email: 'john@example.com' };
                    return createQueryBuilder({ singleData: { data: mockParent, error: null } });
                }
                return createQueryBuilder();
            }),
        };

        (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it('should complete the full pipeline from Stripe to Zoho and Email', async () => {
        // 1. Mock Stripe Webhook Event
        const mockSessionId = 'cs_test_123';
        const mockEnrollmentId = 'enroll_123';
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: mockSessionId,
                    metadata: { enrollmentId: mockEnrollmentId },
                },
            },
        };

        (headers as Mock).mockResolvedValue({
            get: vi.fn().mockReturnValue('valid_signature'),
        });
        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);

        // 2. Prepare Request
        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: JSON.stringify(mockEvent),
        });

        // 3. Execute Pipeline (POST Handler is the orchestrator)
        const response = await POST(request);
        const data = await response.json();

        // 4. Verifications
        expect(response.status).toBe(200);
        expect(data.received).toBe(true);

        // Verify Database Transitions
        expect(mockSupabase.from).toHaveBeenCalledWith('payments');
        expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');

        // Verify Zoho Synchronization (The most important integration point)
        // Note: syncPaymentToZoho is called dynamically via dynamic import in the route
        // We use a regular mock here as the dynamic import will resolve to our mock
        expect(syncPaymentToZoho).toHaveBeenCalledWith('pay_123');

        // Verify Email Confirmation
        expect(sendPaymentReceipt).toHaveBeenCalledWith(expect.objectContaining({
            parentEmail: 'john@example.com',
            className: 'Art 101',
            amount: 150,
            transactionId: mockSessionId
        }));
    });
});
