import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { adminUpdateClass, deleteUser } from '../admin';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('Admin Security Role Boundaries', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: vi.fn(() => ({
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            })),
        };
        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    it('should deny a Teacher from performing admin class updates', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { user_metadata: { role: 'teacher' } } },
            error: null
        });

        const result = await adminUpdateClass('class123', { name: 'Hacked' });
        expect(result.error).toBe('Not authorized');
    });

    it('should deny a Teacher from deleting other users', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'teacher123', user_metadata: { role: 'teacher' } } },
            error: null
        });

        const result = await deleteUser('any_user_123');
        expect(result.error).toBe('Not authorized');
    });
});
