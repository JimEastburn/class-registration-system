import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { POST } from '../route';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { SupabaseClient, createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
    stripe: {
        checkout: {
            sessions: {
                create: vi.fn(),
            },
        },
    },
    formatAmountForStripe: vi.fn((amount: number) => Math.round(amount)),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

describe('Checkout API Route', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;
    let adminFrom: Mock;
    let adminInsert: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();

        const fromObj = {
            insert: mockInsert,
            single: mockSingle,
            select: mockSelect,
            eq: vi.fn().mockReturnThis(),
        };

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => fromObj),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);

        adminInsert = vi.fn().mockResolvedValue({ error: null });
        adminFrom = vi.fn(() => ({
            insert: adminInsert,
        }));
        (createSupabaseClient as Mock).mockReturnValue({
            from: adminFrom,
        });
    });

    it('should return 401 if not authenticated', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Not authenticated');
    });

    it('should return 400 if enrollmentId is missing', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123' } },
            error: null
        });

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Enrollment ID is required');
    });

    it('should return 403 if user does not own the enrollment', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123' } },
            error: null
        });

        // Enrollment check - owned by different parent
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { student: { parent_id: 'otherParent' } },
                error: null
            })
        });

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Not authorized');
    });

    it('should create checkout session and payment record', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123' } },
            error: null
        });

        const mockEnrollment = {
            id: 'enroll123',
            status: 'pending',
            student: { parent_id: 'parent123', first_name: 'Jane', last_name: 'Smith' },
            class: { id: 'class123', name: 'Art 101', price: 150 }
        };

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEnrollment, error: null })
        });

        (stripe.checkout.sessions.create as Mock).mockResolvedValue({
            id: 'cs_123',
            url: 'http://stripe.com/checkout/cs_123'
        });

        const request = new Request('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({ enrollmentId: 'enroll123' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.sessionId).toBe('cs_123');
        expect(data.url).toBe('http://stripe.com/checkout/cs_123');

        expect(stripe.checkout.sessions.create).toHaveBeenCalled();
        expect(createSupabaseClient).toHaveBeenCalled();
        expect(adminFrom).toHaveBeenCalledWith('payments');
        expect(adminInsert).toHaveBeenCalled();
    });
});
