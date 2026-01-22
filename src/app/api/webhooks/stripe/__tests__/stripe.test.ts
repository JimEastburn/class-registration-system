import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '../route';
import { stripe } from '@/lib/stripe';
import { sendPaymentReceipt } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

// Mock the dependencies
vi.mock('@/lib/stripe', () => ({
    stripe: {
        webhooks: {
            constructEvent: vi.fn(),
        },
    },
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

// Mock Zoho library
vi.mock('@/lib/zoho', () => ({
    syncPaymentToZoho: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/email', () => ({
    sendPaymentReceipt: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn().mockResolvedValue({
        get: vi.fn().mockReturnValue('mock-signature'),
    }),
}));

describe('Stripe Webhook API Route', () => {
    let mockSupabase: any;
    let mockBuilder: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockBuilder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
        };

        mockSupabase = {
            from: vi.fn().mockReturnValue(mockBuilder),
        };

        (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it('should return 400 if signature is missing', async () => {
        const { headers } = await import('next/headers');
        (headers as Mock).mockResolvedValueOnce({
            get: vi.fn().mockReturnValue(null),
        });

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('No signature');
    });

    it('should handle checkout.session.completed and update database', async () => {
        const mockEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_123',
                    metadata: { enrollmentId: 'enroll123' },
                },
            },
        };

        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);

        const mockEnrollment = {
            student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent123' },
            class: { name: 'Art 101', fee: 150 }
        };

        const mockParent = {
            first_name: 'John',
            email: 'john@example.com'
        };

        // 1. Initial Idempotency check: status is 'pending'
        // 2. Update payment execution
        // 3. Update enrollment execution
        // 4. Fetch enrollment data
        // 5. Fetch profile data

        mockBuilder.single.mockImplementation(() => {
            // First time called (idempotency check): status is pending
            if (mockBuilder.single.mock.calls.length === 1) {
                return Promise.resolve({ data: { status: 'pending' }, error: null });
            }
            // Second time called (update payment returns id):
            if (mockBuilder.single.mock.calls.length === 2) {
                return Promise.resolve({ data: { id: 'payment123' }, error: null });
            }
            // Third time: fetch enrollment
            if (mockBuilder.single.mock.calls.length === 3) {
                return Promise.resolve({ data: mockEnrollment, error: null });
            }
            // Fourth time: fetch profile
            return Promise.resolve({ data: mockParent, error: null });
        });

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(mockBuilder.update).toHaveBeenCalledTimes(2); // One for payments, one for enrollments
        expect(sendPaymentReceipt).toHaveBeenCalled();
    });

    it('should handle checkout.session.expired and update payment status', async () => {
        const mockEvent = {
            type: 'checkout.session.expired',
            data: {
                object: {
                    id: 'cs_123',
                },
            },
        };

        (stripe.webhooks.constructEvent as Mock).mockReturnValue(mockEvent);

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('payments');
        expect(mockBuilder.update).toHaveBeenCalled();
    });
});
