import { describe, it, expect, vi, beforeEach } from 'vitest';
import ParentDashboardPage from '../page';
import { createClient } from '@/lib/supabase/server';

// Mock the server client
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

describe('ParentDashboardPage', () => {
    const mockUser = {
        id: 'parent-123',
        user_metadata: {
            first_name: 'Jim',
            role: 'admin'
        }
    };

    const mockFamilyMembers = [
        { id: 'student-1' },
        { id: 'student-2' }
    ];

    const mockEnrollments = [
        { id: 'enrollment-1', status: 'confirmed', class: { name: 'Math', teacher_id: 't1' } }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should filter enrollments by family member IDs', async () => {
        const mockFn = vi.fn().mockReturnThis();

        // Define specific return values for the terminal calls in the chains
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
        };

        // We use mockImplementation to return data at the end of the chain
        mockSupabase.eq.mockImplementation(() => Promise.resolve({ data: mockFamilyMembers, count: 2 }));
        mockSupabase.in.mockImplementation((column, values) => {
            // Second call to .in() in the chain will be status, so we check the column
            if (column === 'status') {
                return Promise.resolve({ data: mockEnrollments });
            }
            return mockSupabase; // return the same mock for chaining
        });

        (createClient as any).mockResolvedValue(mockSupabase);

        await ParentDashboardPage();

        expect(mockSupabase.from).toHaveBeenCalledWith('family_members');
        expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');

        expect(mockSupabase.eq).toHaveBeenCalledWith('parent_id', mockUser.id);

        // Verify both .in calls
        expect(mockSupabase.in).toHaveBeenCalledWith('student_id', ['student-1', 'student-2']);
        expect(mockSupabase.in).toHaveBeenCalledWith('status', ['pending', 'confirmed']);
    });

    it('should handle zero family members correctly', async () => {
        const mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
        };

        mockSupabase.eq.mockImplementation(() => Promise.resolve({ data: [], count: 0 }));
        mockSupabase.in.mockImplementation((column) => {
            if (column === 'status') {
                return Promise.resolve({ data: [] });
            }
            return mockSupabase;
        });

        (createClient as any).mockResolvedValue(mockSupabase);

        await ParentDashboardPage();

        expect(mockSupabase.in).toHaveBeenCalledWith('student_id', []);
    });
});
