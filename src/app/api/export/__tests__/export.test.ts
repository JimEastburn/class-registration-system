import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from '../route';
import { createClient } from '@/lib/supabase/server';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Export API Route', () => {
    let mockSupabase: any;

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
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should return 401 if not an admin', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
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
        mockSupabase.auth.getUser.mockResolvedValue({
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

    it('should return 400 for invalid export type', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
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
