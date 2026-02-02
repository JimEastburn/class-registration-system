
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '@/lib/actions/family';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Family Actions', () => {
    const mockUser = { id: 'parent-123' };
    const mockMember = { id: 'child-1', parent_id: 'parent-123', first_name: 'Kid' };
    
    // Setup generic mock for Supabase
    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as any).mockResolvedValue(mockSupabase);
        
        // Default auth success
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('createFamilyMember', () => {
        it('creates member successfully', async () => {
             const mockInsert = vi.fn().mockReturnValue({
                 select: vi.fn().mockReturnValue({
                     single: vi.fn().mockResolvedValue({ data: { ...mockMember }, error: null })
                 })
             });
             
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'family_members') {
                    return {
                        insert: mockInsert,
                    };
                }
                if (table === 'audit_logs') {
                    return { insert: vi.fn().mockResolvedValue({}) };
                }
                return {};
            });

            const result = await createFamilyMember({ firstName: 'Kid', lastName: 'Doe' });

            expect(result.data).toBeDefined();
            expect(result.data?.first_name).toBe('Kid');
            expect(revalidatePath).toHaveBeenCalled();

            // Verify called with parent_id
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                parent_id: mockUser.id,
                first_name: 'Kid'
            }));
        });

        it('enforces ownership by assigning the authenticated user as parent_id', async () => {
             const mockInsert = vi.fn().mockReturnValue({
                 select: vi.fn().mockReturnValue({
                     single: vi.fn().mockResolvedValue({ data: { ...mockMember }, error: null })
                 })
             });
             
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'family_members') {
                    return {
                        insert: mockInsert,
                    };
                }
                if (table === 'audit_logs') {
                    return { insert: vi.fn().mockResolvedValue({}) };
                }
                return {};
            });

            // Even if we try to pass a different parent_id (though the type verification prevents it in TS, 
            // the implementation should ignore anything but the auth user's id)
            // Note: The input type CreateFamilyMemberInput doesn't strictly include parent_id, 
            // but this test confirms that the ACTION takes the ID from the session, not from any potential input leakage
             await createFamilyMember({ firstName: 'Kid', lastName: 'Doe' });

            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                parent_id: mockUser.id,
            }));
        });

        it('handles unauthenticated user', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
            const result = await createFamilyMember({ firstName: 'Kid', lastName: 'Doe' });
            expect(result.error).toBe('Not authenticated');
        });
    });

    describe('updateFamilyMember', () => {
         it('updates member if owned by user', async () => {
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'family_members') {
                    // We need to distinguish between the verification select and the update
                    // but since they are chained differently, standard mocks might be tricky.
                    // simpler strategy: verify calls are sequential.
                    return {
                         select: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockReturnValue({
                                      single: vi.fn().mockResolvedValue({ data: { id: 'child-1' }, error: null })
                                 })
                             })
                         }),
                         update: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 select: vi.fn().mockReturnValue({
                                      single: vi.fn().mockResolvedValue({ data: { ...mockMember, first_name: 'Updated' }, error: null })
                                 })
                             })
                         })
                    };
                }
                if (table === 'audit_logs') {
                    return { insert: vi.fn().mockResolvedValue({}) };
                }
                 return {};
            });

             const result = await updateFamilyMember({ id: 'child-1', firstName: 'Updated' });
             expect(result.data?.first_name).toBe('Updated');
         });

         it('fails if member not found or not owned', async () => {
             // Mock verification check returning null
             mockSupabase.from.mockReturnValue({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
                         })
                     })
                 })
             });

             const result = await updateFamilyMember({ id: 'other-child', firstName: 'Updated' });
             expect(result.error).toContain('not found or you do not have permission');
         });
    });

    describe('deleteFamilyMember', () => {
         it('deletes member if owned', async () => {
             mockSupabase.from.mockImplementation((table) => {
                 if (table === 'family_members') {
                     return {
                         delete: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockResolvedValue({ error: null })
                             })
                         })
                     };
                 }
                 if (table === 'audit_logs') {
                     return { insert: vi.fn() };
                 }
                return {};
            });

             const result = await deleteFamilyMember('child-1');
             expect(result.success).toBe(true);
         });
    });
});
