import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { addFamilyMember, updateFamilyMember, deleteFamilyMember } from '../family';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock the dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Family Server Actions implementation', () => {
    let mockSupabase: any;

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

    describe('addFamilyMember', () => {
        it('should return error if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
            const result = await addFamilyMember(new FormData());
            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('should insert family member and revalidate', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            const formData = new FormData();
            formData.append('firstName', 'Jane');
            formData.append('lastName', 'Doe');
            formData.append('relationship', 'child');
            formData.append('gradeLevel', '5');
            formData.append('birthDate', '2015-05-15');
            formData.append('notes', 'Loves art');

            const result = await addFamilyMember(formData);

            expect(mockSupabase.from).toHaveBeenCalledWith('family_members');
            expect(mockSupabase.from('family_members').insert).toHaveBeenCalledWith({
                parent_id: 'parent123',
                first_name: 'Jane',
                last_name: 'Doe',
                relationship: 'child',
                grade_level: '5',
                birth_date: '2015-05-15',
                notes: 'Loves art',
            });
            expect(revalidatePath).toHaveBeenCalledWith('/parent/family');
            expect(result).toEqual({ success: true });
        });

        it('should handle optional fields as null', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            const formData = new FormData();
            formData.append('firstName', 'Jane');
            formData.append('lastName', 'Doe');
            formData.append('relationship', 'child');

            await addFamilyMember(formData);

            expect(mockSupabase.from('family_members').insert).toHaveBeenCalledWith(expect.objectContaining({
                grade_level: null,
                birth_date: null,
                notes: null,
            }));
        });
    });

    describe('updateFamilyMember', () => {
        it('should update family member and revalidate', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            const formData = new FormData();
            formData.append('firstName', 'Jane');
            formData.append('lastName', 'Smith');
            formData.append('relationship', 'child');

            const mockUpdate = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockUpdate });
            mockSupabase.from.mockReturnValue({
                update: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await updateFamilyMember('fm123', formData);

            expect(mockSupabase.from).toHaveBeenCalledWith('family_members');
            expect(mockUpdate).toHaveBeenCalledWith('parent_id', 'parent123');
            expect(revalidatePath).toHaveBeenCalledWith('/parent/family');
            expect(result).toEqual({ success: true });
        });
    });

    describe('deleteFamilyMember', () => {
        it('should delete family member and revalidate', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'parent123' } }, error: null });

            const mockDelete = vi.fn().mockResolvedValue({ error: null });
            const mockEq = vi.fn().mockReturnValue({ eq: mockDelete });
            mockSupabase.from.mockReturnValue({
                delete: vi.fn().mockReturnValue({ eq: mockEq })
            });

            const result = await deleteFamilyMember('fm123');

            expect(mockSupabase.from).toHaveBeenCalledWith('family_members');
            expect(mockDelete).toHaveBeenCalledWith('parent_id', 'parent123');
            expect(revalidatePath).toHaveBeenCalledWith('/parent/family');
            expect(result).toEqual({ success: true });
        });
    });
});
