import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import ClassSchedulerProfilePage from '../page';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}));

// Mock ProfileForm
vi.mock('@/components/profile/ProfileForm', () => ({
    default: () => null,
}));

describe('ClassSchedulerProfilePage', () => {
    const mockUser = {
        id: 'scheduler-123',
        email: 'scheduler@example.com',
    };

    const mockProfile = {
        id: 'scheduler-123',
        role: 'class_scheduler',
        first_name: 'Scheduler',
        last_name: 'One',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch profile and render correctly', async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile }),
        };

        (createClient as Mock).mockResolvedValue(mockSupabase);

        await ClassSchedulerProfilePage();

        expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
        expect(mockSupabase.select).toHaveBeenCalledWith('*');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockUser.id);
        expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should redirect if user is not logged in', async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
            },
        };
        (createClient as Mock).mockResolvedValue(mockSupabase);

        try {
            await ClassSchedulerProfilePage();
        } catch (e) {
            // redirect throws an error in Next.js
        }

        expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('should redirect if profile not found', async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null }),
        };
        (createClient as Mock).mockResolvedValue(mockSupabase);

        try {
            await ClassSchedulerProfilePage();
        } catch (e) {
            // redirect throws
        }

        expect(redirect).toHaveBeenCalledWith('/login');
    });
});
