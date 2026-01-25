import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClass, updateClass } from '@/lib/actions/classes';
import { createClient } from '@/lib/supabase/server';

// Robust Mock Setup
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

// This is the object returned by from(), update(), etc.
// It must be thennable to support 'await supabase.from(...).update(...)'
const mockQueryBuilder = {
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: mockEq,
    single: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ error: null }),
};

// Ensure chaining works
mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);

const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
};

mockFrom.mockReturnValue(mockQueryBuilder);
mockInsert.mockReturnValue(mockQueryBuilder);
mockUpdate.mockReturnValue(mockQueryBuilder);

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        auth: { getUser: mockGetUser },
        from: mockFrom,
    })),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Teacher Schedule Restriction', () => {
    const mockTeacherUser = {
        id: 'teacher-123',
        email: 'teacher@example.com',
        user_metadata: { role: 'teacher' },
    };

    const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: { role: 'admin' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should ignore schedule provided by teacher during createClass and default to "To Be Announced"', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockTeacherUser } });

        const formData = new FormData();
        formData.append('name', 'Math Class');
        formData.append('location', 'Room 101');
        formData.append('startDate', '2024-01-01');
        formData.append('endDate', '2024-05-30');
        formData.append('schedule', 'Mon 10am');
        formData.append('maxStudents', '20');
        formData.append('fee', '100');

        const result = await createClass(formData);

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Math Class',
            teacher_id: mockTeacherUser.id,
            schedule: 'To Be Announced',
        }));
    });

    it('should allow admin to set schedule during createClass', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockAdminUser } });

        const formData = new FormData();
        formData.append('name', 'Math Class');
        formData.append('location', 'Room 101');
        formData.append('startDate', '2024-01-01');
        formData.append('endDate', '2024-05-30');
        formData.append('schedule', 'Mon 10am');
        formData.append('maxStudents', '20');
        formData.append('fee', '100');

        const result = await createClass(formData);

        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Math Class',
            teacher_id: mockAdminUser.id,
            schedule: 'Mon 10am',
        }));
    });

    it('should ignore schedule provided by teacher during updateClass', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockTeacherUser } });

        const formData = new FormData();
        formData.append('name', 'Math Class Updated');
        formData.append('location', 'Room 102');
        formData.append('startDate', '2024-01-01');
        formData.append('endDate', '2024-05-30');
        formData.append('schedule', 'Tue 10am');
        formData.append('maxStudents', '25');
        formData.append('fee', '120');

        const result = await updateClass('class-123', formData);

        expect(result.success).toBe(true);

        const updateCallArgs = mockUpdate.mock.calls[0][0];

        expect(updateCallArgs).not.toHaveProperty('schedule');
        expect(updateCallArgs).toEqual(expect.objectContaining({
            name: 'Math Class Updated',
            location: 'Room 102',
        }));
    });
});
