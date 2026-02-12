import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Export API Route', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockSelect = vi.fn().mockReturnThis();
        const mockOrder = vi.fn().mockReturnThis();

        const fromObj = {
            select: mockSelect,
            order: mockOrder,
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

    it('should return 401 if not an admin', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'parent' } } },
            error: null
        });

        const request = new Request('http://localhost:3000/api/export?type=users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return CSV data for users', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null
        });

        const mockUsers = [
            { id: '1', email: 'test@example.com', first_name: 'John', last_name: 'Doe', role: 'parent', created_at: '2024-01-01' }
        ];

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
        });

        const request = new Request('http://localhost:3000/api/export?type=users');

        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/csv');
        expect(text).toContain('test@example.com');
        expect(text).toContain('John');
        expect(text).toContain('Doe');
    });

    it('should return CSV data for classes with teacher names', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null
        });

        const mockClasses = [
            { id: 'c1', name: 'Art 101', status: 'published', teacher: { first_name: 'Dali', last_name: 'Salvador' }, fee: 100 }
        ];

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockClasses, error: null })
        });

        const request = new Request('http://localhost:3000/api/export?type=classes');
        const response = await GET(request);
        const text = await response.text();

        expect(response.status).toBe(200);
        expect(text).toContain('Art 101');
        expect(text).toContain('Dali Salvador');
    });

    it('should return CSV data for enrollments with names', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null
        });

        const mockEnrollments = [
            { id: 'e1', status: 'confirmed', student: { first_name: 'Jane', last_name: 'Doe' }, class: { name: 'Art 101', fee: 100 } }
        ];

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockEnrollments, error: null })
        });

        const request = new Request('http://localhost:3000/api/export?type=enrollments');
        const response = await GET(request);
        const text = await response.text();

        expect(text).toContain('Jane Doe');
        expect(text).toContain('Art 101');
    });

    it('should identify CSV injection vulnerability in data', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null
        });

        const mockMaliciousUsers = [
            { id: '1', email: '=SUM(1,2)', first_name: '@John', last_name: '+Doe', role: 'parent', created_at: '2024-01-01' }
        ];

        mockSupabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockMaliciousUsers, error: null })
        });

        const request = new Request('http://localhost:3000/api/export?type=users');
        const response = await GET(request);
        const text = await response.text();

        // If the implementation is secure, it should escape the leading characters
        // Standard security practice is to prefix with a single quote '
        // Let's see if it currently does (it probably doesn't based on the code I saw)
        expect(text).toContain('\"\'=SUM(1,2)\"');
        expect(text).toContain('\"\'@John\"');
        expect(text).toContain('\"\'+Doe\"');
    });

    it('should return 400 for invalid export type', async () => {
        (mockSupabase.auth.getUser as Mock).mockResolvedValue({
            data: { user: { user_metadata: { role: 'admin' } } },
            error: null
        });

        const request = new Request('http://localhost:3000/api/export?type=invalid');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid export type');
    });
});
