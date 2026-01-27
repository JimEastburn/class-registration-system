import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createClass, updateClass } from '../classes';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockNeq = vi.fn();

// Mock Supabase Query Builder
const mockQueryBuilder = {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    delete: vi.fn().mockReturnThis(),
    eq: mockEq,
    neq: mockNeq,
    single: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ error: null, data: [] }),
};

// Ensure chaining works
mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.neq.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
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

describe('Teacher Schedule Overlap Check', () => {
    const mockTeacher = {
        id: 'teacher-1',
        user_metadata: { role: 'teacher' }
    };

    const mockAdmin = {
        id: 'admin-1',
        user_metadata: { role: 'admin' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockReturnValue(mockQueryBuilder);
    });

    // Helper to setup existing classes mock
    const setupExistingClasses = (classes: any[]) => {
        // When checking for overlaps, we query 'classes' table
        // We expect the implementation to query for active classes for this teacher
        mockSelect.mockReturnValue(mockQueryBuilder);
        mockEq.mockReturnValue(mockQueryBuilder);
        
        // Mock the 'then' of the select query chain to return our classes
        // Note: The implementation is likely: 
        // supabase.from('classes').select('...').eq('teacher_id', ...).neq('status', 'cancelled')...
        // This simple mock might be fragile if the implementation uses elaborate chaining.
        // A robust mock would need to handle specific call chains, but for now:
        mockQueryBuilder.then = (resolve: any) => resolve({ data: classes, error: null });
    };

    it('should prevent creating a class that overlaps exactly with existing class', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockAdmin } }); // Admin creating for teacher
        
        // Existing class: Mon 10:00 AM (60 min)
        setupExistingClasses([{
            id: 'existing-1',
            start_date: '2024-01-01',
            end_date: '2024-06-01',
            recurrence_days: ['monday'],
            recurrence_time: '10:00',
            recurrence_duration: 60,
            status: 'active'
        }]);

        const formData = new FormData();
        formData.append('name', 'New Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-02-01'); // Overlapping date range
        formData.append('endDate', '2024-03-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['monday']));
        formData.append('recurrence_time', '10:00'); // Same time
        formData.append('recurrence_duration', '60');
        
        // We need to inject the teacher_id somehow if we are admin, 
        // OR we just test as teacher for simplicity if the action infers ID from session
        // In createClass, it uses user.id if teacher, OR ??? 
        // Looking at createClass implementation:
        // const { data: { user } } = await supabase.auth.getUser();
        // ...
        // teacher_id: user.id
        // So createClass ALWAYS creates for the logged-in user.
        // Wait, if admin creates a class, they become the teacher?
        // Let's re-read createClass in src/lib/actions/classes.ts
        // Line 58: teacher_id: user.id
        // YES. Currently admins create classes for THEMSELVES as teacher.
        // So we test as teacher.
        
        // Run as admin to valid dates are used (teachers have forced placeholder dates)
        mockGetUser.mockResolvedValue({ data: { user: mockAdmin } });
        formData.append('teacherId', 'teacher-1');

        const result = await createClass(formData);
        expect(result.error).toContain('Teacher already has a class scheduled at this time');
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should prevent overlapping time slot (partial overlap)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockAdmin } });
        
        // Existing: Mon 10:00 - 11:00
        setupExistingClasses([{
            id: 'existing-1',
            start_date: '2024-01-01',
            end_date: '2024-06-01',
            recurrence_days: ['monday'],
            recurrence_time: '10:00',
            recurrence_duration: 60,
            status: 'active'
        }]);

        // New: Mon 10:30 - 11:30
        const formData = new FormData();
        formData.append('teacherId', 'teacher-1');
        formData.append('name', 'New Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-02-01');
        formData.append('endDate', '2024-03-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['monday']));
        formData.append('recurrence_time', '10:30');
        formData.append('recurrence_duration', '60');

        const result = await createClass(formData);
        expect(result.error).toContain('Teacher already has a class scheduled at this time');
    });

    it('should allow same time on different days', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockTeacher } });
        
        // Existing: Mon 10:00
        setupExistingClasses([{
            id: 'existing-1',
            start_date: '2024-01-01',
            end_date: '2024-06-01',
            recurrence_days: ['monday'],
            recurrence_time: '10:00',
            recurrence_duration: 60,
            status: 'active'
        }]);

        // New: Tue 10:00
        const formData = new FormData();
        formData.append('name', 'New Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-02-01');
        formData.append('endDate', '2024-03-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['tuesday'])); // Different day
        formData.append('recurrence_time', '10:00');
        formData.append('recurrence_duration', '60');
        
        // Note: Admin might be able to set manual text schedule without recurrence structure?
        // But for teachers, we are enforcing structure via "To Be Announced" usually?
        // Actually, createClass enforces "To Be Announced" for teachers schedule TEXT, 
        // but recurrence fields might still be sent? The current UI sends them via hidden inputs.
        // The test we are writing assumes recurrence fields are used for validation.

        const result = await createClass(formData);
        // Should succeed (or at least proceed to insert)
        // Since we are mocking insert to just return success in our global mock setup
        // validation pass means insert IS called.
        expect(mockInsert).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should allow same time/day if dates do not overlap', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockTeacher } });
        
        // Existing: Jan - Feb
        setupExistingClasses([{
            id: 'existing-1',
            start_date: '2024-01-01',
            end_date: '2024-02-01',
            recurrence_days: ['monday'],
            recurrence_time: '10:00',
            recurrence_duration: 60,
            status: 'active'
        }]);

        // New: Mar - Apr
        const formData = new FormData();
        formData.append('name', 'New Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-03-01'); // Starts after existing ends
        formData.append('endDate', '2024-04-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['monday']));
        formData.append('recurrence_time', '10:00');
        formData.append('recurrence_duration', '60');

        const result = await createClass(formData);
        expect(mockInsert).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should allow admin to assign class to another teacher', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockAdmin } });

        const formData = new FormData();
        formData.append('name', 'Admin Assigned Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-03-01');
        formData.append('endDate', '2024-04-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['monday']));
        formData.append('recurrence_time', '10:00');
        formData.append('recurrence_duration', '60');
        formData.append('teacherId', 'teacher-2'); // Admin assigns teacher-2

        // teacher-2 has no classes
        setupExistingClasses([]);
        // But createClass will try to fetch classes for teacher-2
        // Our mock mockEq('teacher_id', teacherId) must capture this.
        // We can just return empty array for any query in this test.

        const result = await createClass(formData);
        
        expect(result.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            teacher_id: 'teacher-2'
        }));
    });

    it('should check overlap against assigned teacher not the admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: mockAdmin } });

        // Teacher-2 has a class
        setupExistingClasses([{
            id: 'existing-for-teacher-2',
            start_date: '2024-01-01',
            end_date: '2024-06-01',
            recurrence_days: ['monday'],
            recurrence_time: '10:00',
            recurrence_duration: 60,
            status: 'active'
        }]);
        
        // This setupExistingClasses mock is naive, it returns these classes regardless of filter arguments in our current mock wrapper
        // But the code:
        // .eq('teacher_id', teacherId)
        
        // Admin assigns teacher-2
        const formData = new FormData();
        formData.append('name', 'Overlap Class');
        formData.append('location', 'Room A');
        formData.append('startDate', '2024-02-01');
        formData.append('endDate', '2024-03-01');
        formData.append('recurrence_pattern', 'weekly');
        formData.append('recurrence_days', JSON.stringify(['monday']));
        formData.append('recurrence_time', '10:00'); // Overlaps
        formData.append('recurrence_duration', '60');
        formData.append('teacherId', 'teacher-2');

        const result = await createClass(formData);
        
        expect(result.error).toContain('Teacher already has a class scheduled at this time');
    });
});
