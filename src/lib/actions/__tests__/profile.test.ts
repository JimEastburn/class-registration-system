import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { updateProfile, getProfile } from '../profile';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Profile Server Actions implementation', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

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
                updateUser: vi.fn().mockResolvedValue({ error: null }),
            },
            from: vi.fn(() => fromObj),
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('updateProfile', () => {
        it('should return error if not authenticated', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });
            const result = await updateProfile({ firstName: 'John', lastName: 'Doe' });
            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('should update profile database and auth metadata', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'user123', user_metadata: { role: 'parent' } } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            } as unknown as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await updateProfile({
                firstName: 'Jane',
                lastName: 'Smith',
                phone: '1234567890',
                bio: 'Artist'
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
            expect(mockUpdate).toHaveBeenCalledWith('id', 'user123');
            expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
                data: { first_name: 'Jane', last_name: 'Smith' }
            });
            expect(revalidatePath).toHaveBeenCalledWith('/parent/profile');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getProfile', () => {
        it('should return null if not authenticated', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({ data: { user: null }, error: null });
            const result = await getProfile();
            expect(result).toBeNull();
        });

        it('should return profile data', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'user123' } },
                error: null
            });

            const mockProfile = { id: 'user123', first_name: 'John', last_name: 'Doe' };
            mockSupabase.from.mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
            } as unknown as any); // eslint-disable-line @typescript-eslint/no-explicit-any

            const result = await getProfile();
            expect(result).toEqual(mockProfile);
        });
    });
});
