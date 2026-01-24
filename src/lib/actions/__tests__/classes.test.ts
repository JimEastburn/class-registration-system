import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { createClass, updateClass, updateClassStatus, deleteClass } from '../classes';
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

describe('Classes Server Actions implementation', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnThis();
        const mockDelete = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();

        const fromObj = {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            eq: mockEq,
            single: mockSingle,
            select: vi.fn().mockReturnThis(),
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

    describe('createClass', () => {
        it('should return error if not a teacher', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'parent' } } },
                error: null
            });
            const result = await createClass(new FormData());
            expect(result).toEqual({ error: 'Only teachers can create classes' });
        });

        it('should create class and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'teacher123', user_metadata: { role: 'teacher' } } },
                error: null
            });

            const formData = new FormData();
            formData.append('name', 'Art 101');
            formData.append('description', 'Intro to art');
            formData.append('location', 'Studio A');
            formData.append('startDate', '2024-01-01');
            formData.append('endDate', '2024-03-01');
            formData.append('schedule', 'Mon 10am');
            formData.append('maxStudents', '20');
            formData.append('fee', '150.50');
            formData.append('syllabus', 'Art syllabus');

            const result = await createClass(formData);

            expect(mockSupabase.from).toHaveBeenCalledWith('classes');
            expect(mockSupabase.from('classes').insert).toHaveBeenCalledWith({
                teacher_id: 'teacher123',
                name: 'Art 101',
                description: 'Intro to art',
                location: 'Studio A',
                start_date: '2024-01-01',
                end_date: '2024-03-01',
                schedule: 'Mon 10am',
                max_students: 20,
                fee: 150.5,
                syllabus: 'Art syllabus',
                status: 'draft',
            });
            expect(revalidatePath).toHaveBeenCalledWith('/teacher/classes');
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateClass', () => {
        it('should update class and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'teacher123' } },
                error: null
            });

            const formData = new FormData();
            formData.append('name', 'Art 101 Updated');
            formData.append('maxStudents', '25');

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockUpdate });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await updateClass('class123', formData);

            expect(mockSupabase.from).toHaveBeenCalledWith('classes');
            expect(mockUpdate).toHaveBeenCalledWith('teacher_id', 'teacher123');
            expect(revalidatePath).toHaveBeenCalledWith('/teacher/classes');
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateClassStatus', () => {
        it('should update status and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'teacher123' } },
                error: null
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockUpdate });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await updateClassStatus('class123', 'active');

            expect(result).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith('teacher_id', 'teacher123');
            expect(revalidatePath).toHaveBeenCalledWith('/teacher/classes');
        });
    });

    describe('deleteClass', () => {
        it('should only delete draft classes', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'teacher123' } },
                error: null
            });

            // Class is active, not draft
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'active' }, error: null })
            });

            const result = await deleteClass('class123');
            expect(result).toEqual({ error: 'Only draft classes can be deleted' });
        });

        it('should delete draft class and revalidate', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { id: 'teacher123' } },
                error: null
            });

            // Class is draft
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { status: 'draft' }, error: null })
            });

            const mockDelete = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockDelete });
            mockSupabase.from.mockReturnValueOnce({
                delete: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await deleteClass('class123');
            expect(result).toEqual({ success: true });
            expect(revalidatePath).toHaveBeenCalledWith('/teacher/classes');
        });
    });
});
