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

    beforeEach(() => {
        vi.clearAllMocks();

        const createQueryBuilder = (initialResult = { data: null, error: null }) => {
            const builder: any = {
                select: vi.fn().mockImplementation(() => builder),
                eq: vi.fn().mockImplementation(() => builder),
                update: vi.fn().mockImplementation(() => builder),
                single: vi.fn().mockResolvedValue(initialResult),
            };
            return builder;
        };

        mockSupabase = {
            from: vi.fn().mockImplementation((table) => {
                if (table === 'payments') {
                    return createQueryBuilder({ data: { id: 'payment123' }, error: null });
                }
                if (table === 'enrollments') {
                    const mockEnrollment = {
                        student: { first_name: 'Jane', last_name: 'Smith', parent_id: 'parent123' },
                        class: { name: 'Art 101', fee: 150 }
                    };
                    return createQueryBuilder({ data: mockEnrollment, error: null });
                }
                if (table === 'profiles') {
                    const mockParent = {
                        first_name: 'John',
                        email: 'john@example.com'
                    };
                    return createQueryBuilder({ data: mockParent, error: null });
                }
                return createQueryBuilder();
            }),
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

        // Mock updates for payment and enrollment
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'payment123' }, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockUpdatePayment = vi.fn().mockReturnValue({ select: mockSelect });

        mockSupabase.from.mockReturnValueOnce({
            update: vi.fn().mockReturnValue({ eq: mockUpdatePayment })
        });

        const mockUpdateEnrollment = vi.fn().mockResolvedValue({ error: null });
        mockSupabase.from.mockReturnValueOnce({
            update: vi.fn().mockReturnValue({ eq: mockUpdateEnrollment })
        });

        // Mock selects for email data
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEnrollment, error: null })
        });

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockParent, error: null })
        });

        const request = new Request('http://localhost:3000/api/webhooks/stripe', {
            method: 'POST',
            body: 'payload',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(mockUpdatePayment).toHaveBeenCalled();
        expect(mockUpdateEnrollment).toHaveBeenCalled();
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
    });
});
