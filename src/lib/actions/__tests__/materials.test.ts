import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { addMaterial, deleteMaterial, updateMaterial } from '../materials';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Materials Server Actions implementation', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockInsert = vi.fn().mockReturnThis();
        const mockUpdate = vi.fn().mockReturnThis();
        const mockDelete = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockSingle = vi.fn();
        const mockSelect = vi.fn().mockReturnThis();
        const mockOrder = vi.fn().mockReturnThis();

        const fromObj = {
            insert: mockInsert,
            update: mockUpdate,
            delete: mockDelete,
            eq: mockEq,
            single: mockSingle,
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

    describe('addMaterial', () => {
        it('should return error if not a teacher/admin', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'user123', user_metadata: { role: 'parent' } } },
                error: null
            });
            // Class check - not the teacher
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { teacher_id: 'otherTeacher' }, error: null })
            });

            const result = await addMaterial('class123', {
                name: 'Syllabus',
                fileUrl: 'http://example.com/art.pdf',
                fileType: 'application/pdf'
            });
            expect(result.error).toContain('permission');
        });

        it('should add material if teacher', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'teacher123', user_metadata: { role: 'teacher' } } },
                error: null
            });
            // Class check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { teacher_id: 'teacher123' }, error: null })
            });

            // Mock insert with select().single()
            const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'mat123' }, error: null });
            const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
            mockSupabase.from.mockReturnValueOnce({
                insert: vi.fn().mockReturnValue({ select: mockSelect })
            });

            const result = await addMaterial('class123', {
                name: 'Syllabus',
                fileUrl: 'http://example.com/art.pdf',
                fileType: 'application/pdf'
            });

            expect(mockSupabase.from).toHaveBeenCalledWith('class_materials');
            expect(result).toEqual({ success: true, materialId: 'mat123' });
        });
    });

    describe('deleteMaterial', () => {
        it('should return error if material not found', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher123' } }, error: null });
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null })
            });

            const result = await deleteMaterial('mat123');
            expect(result.error).toBe('Material not found');
        });

        it('should delete material if authorized', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'teacher123', user_metadata: { role: 'teacher' } } },
                error: null
            });
            // Material check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'mat123', class_id: 'class123', class: { teacher_id: 'teacher123' } },
                    error: null
                })
            });

            const mockDelete = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValueOnce({
                delete: vi.fn().mockReturnValue({ eq: mockDelete })
            });

            const result = await deleteMaterial('mat123');
            expect(result).toEqual({ success: true });
        });
    });

    describe('updateMaterial', () => {
        it('should update material if authorized', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'teacher123', user_metadata: { role: 'teacher' } } },
                error: null
            });
            // Material check
            mockSupabase.from.mockReturnValueOnce({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: { id: 'mat123', class_id: 'class123', class: { teacher_id: 'teacher123' } },
                    error: null
                })
            });

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            mockSupabase.from.mockReturnValueOnce({
                update: vi.fn().mockReturnValue({ eq: mockUpdate })
            });

            const result = await updateMaterial('mat123', { name: 'New Name' });
            expect(result).toEqual({ success: true });
        });
    });
});
