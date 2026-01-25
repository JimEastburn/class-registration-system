import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createClass, updateClass } from '@/lib/actions/classes';
import { createAdminClient } from '@/lib/supabase/admin';

// Mocks
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Class Scheduler Role Integration', () => {
    let mockSupabase: any;
    let mockAdminClient: any;

    const mockAdminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        user_metadata: { role: 'admin' },
    };

    const mockSchedulerUser = {
        id: 'scheduler-123',
        email: 'scheduler@example.com',
        user_metadata: { role: 'class_scheduler' },
    };

    beforeEach(() => {
        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: mockSchedulerUser } }),
            },
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
        };

        (createClient as any).mockResolvedValue(mockSupabase);

        mockAdminClient = {
            auth: {
                admin: {
                    updateUserById: vi.fn().mockResolvedValue({ error: null }),
                },
            },
        };
        (createAdminClient as any).mockReturnValue(mockAdminClient);
    });

    it('should allow class_scheduler to create a class', async () => {
        mockSupabase.from().insert.mockResolvedValue({ error: null });

        const formData = new FormData();
        formData.append('name', 'New Math Class');
        formData.append('location', 'Room 101');
        formData.append('startDate', '2024-01-01');
        formData.append('endDate', '2024-05-30');
        formData.append('schedule', 'Mon 10am');
        formData.append('maxStudents', '20');
        formData.append('fee', '100');

        const result = await createClass(formData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('classes');
        expect(mockSupabase.from().insert).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Math Class',
            teacher_id: mockSchedulerUser.id,
        }));
    });

    it('should allow class_scheduler to update any class (bypass teacher check)', async () => {
        // Setup mock for update query chain
        mockSupabase.from().update.mockReturnThis();
        // The implementation checks for restrictions. 
        // If restricted, it chains .eq('teacher_id', user.id).
        // Since we want to verify it DOES NOT chain that, we can verify the call count or arguments.

        // Mock eq to return a distinct object if called with teacher_id
        const eqMock = vi.fn().mockImplementation((col, val) => {
            if (col === 'teacher_id') {
                return { ...mockSupabase, _teacherIdCalled: true };
            }
            return mockSupabase;
        });
        mockSupabase.from().update().eq = eqMock;

        const formData = new FormData();
        formData.append('name', 'Updated Math Class');
        formData.append('location', 'Room 102');
        formData.append('startDate', '2024-01-01');
        formData.append('endDate', '2024-05-30');
        formData.append('schedule', 'Mon 10am');
        formData.append('maxStudents', '25');
        formData.append('fee', '120');

        const result = await updateClass('class-456', formData);

        expect(result.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('classes');

        // Ensure eq was called only for 'id' (and not 'teacher_id')
        // The implementation calls .eq('id', id) always.
        // It shoud NOT call .eq('teacher_id', ...)
        expect(eqMock).toHaveBeenCalledWith('id', 'class-456');
        expect(eqMock).not.toHaveBeenCalledWith('teacher_id', mockSchedulerUser.id);
    });
});
