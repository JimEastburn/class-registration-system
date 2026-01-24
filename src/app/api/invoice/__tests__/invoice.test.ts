import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Invoice API Route', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();

        const fromObj = {
            single: mockSingle,
            select: mockSelect,
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
        };

        // Setup mock Supabase client
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => fromObj),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should return 401 if not authenticated', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if id is missing', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123' } },
            error: null
        });

        const request = new Request('http://localhost:3000/api/invoice');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Payment ID required');
    });

    it('should return 403 if user not authorized to view invoice', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123', user_metadata: { role: 'parent' } } },
            error: null
        });

        const mockPayment = {
            id: 'pay123',
            enrollment_id: 'enroll123',
            amount: 100,
            status: 'completed',
            created_at: '2024-01-01',
            enrollment: {
                student: { first_name: 'Jane', last_name: 'Smith' },
                class: { name: 'Art 101', fee: 100 },
                parent: { first_name: 'John', last_name: 'Smith', email: 'john@example.com' }
            }
        };

        // Payment check
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPayment, error: null })
        });

        // Family members check - return empty
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: [], error: null })
        });

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied');
    });

    it('should return HTML invoice for authorized user', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { id: 'parent123', user_metadata: { role: 'parent' } } },
            error: null
        });

        const mockPayment = {
            id: 'pay123',
            enrollment_id: 'enroll123',
            amount: 100,
            status: 'completed',
            created_at: '2024-01-01',
            enrollment: {
                student: { first_name: 'Jane', last_name: 'Smith' },
                class: { name: 'Art 101', fee: 100, schedule: 'Mon 10am', location: 'Studio A', start_date: '2024-01-01', end_date: '2024-03-01' },
                parent: { first_name: 'John', last_name: 'Smith', email: 'john@example.com', phone: '123' }
            }
        };

        // Payment check
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPayment, error: null })
        });

        // Family members check
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: 'student123' }], error: null })
        });

        // Enrollments check
        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [{ id: 'enroll123' }], error: null })
        });

        const request = new Request('http://localhost:3000/api/invoice?id=pay123');

        const response = await GET(request);
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/html');
        expect(html).toContain('Invoice');
        expect(html).toContain('INV-PAY123');
        expect(html).toContain('Art 101');
    });
});
