
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollStudent } from '@/lib/actions/enrollments';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
    logAuditAction: vi.fn(),
}));

describe('Enrollment Actions', () => {
    const mockUser = { id: 'parent-123' };
    const mockMember = { id: 'child-1', parent_id: 'parent-123', relationship: 'Student' };
    const mockClass = { id: 'class-1', capacity: 10, teacher_id: 'teacher-1', teacher: { first_name: 'Teacher', last_name: 'One' } };

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as any).mockResolvedValue(mockSupabase);
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('enrollStudent', () => {
        it('enrolls successfully if space available', async () => {
             const enrollmentsBuilder = {
                 select: vi.fn()
                     // 1. Existing check
                     .mockReturnValueOnce({
                          eq: vi.fn().mockReturnValue({
                              eq: vi.fn().mockReturnValue({
                                   single: vi.fn().mockResolvedValue({ data: null, error: null })
                              })
                          })
                     })
                     // 2. Capacity count check (5 enrollments, capacity 10)
                     .mockReturnValueOnce({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockResolvedValue({ count: 5, error: null })
                         })
                     }),
                 insert: vi.fn().mockReturnValue({
                     select: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { id: 'enrollment-1', status: 'pending' }, error: null })
                     })
                 })
             };

             mockSupabase.from.mockImplementation((table) => {
                 if (table === 'family_members') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                  single: vi.fn().mockResolvedValue({ data: mockMember, error: null })
                             })
                         })
                     })
                 };
                 if (table === 'enrollments') return enrollmentsBuilder;
                 if (table === 'classes') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             single: vi.fn().mockResolvedValue({ data: mockClass, error: null })
                         })
                     })
                 };
                 if (table === 'class_blocks') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 single: vi.fn().mockResolvedValue({ data: null, error: null })
                             })
                         })
                     })
                 };
                 return {};
             });

            const result = await enrollStudent({ classId: 'class-1', familyMemberId: 'child-1' });

            expect(result.status).toBe('pending');
            expect(result.data).toBeDefined(); 
        });

        it('waitlists if class is full', async () => {
             const enrollmentsBuilder = {
                 select: vi.fn()
                     // 1. Existing check
                     .mockReturnValueOnce({
                          eq: vi.fn().mockReturnValue({
                              eq: vi.fn().mockReturnValue({
                                   single: vi.fn().mockResolvedValue({ data: null, error: null })
                              })
                          })
                     })
                     // 2. Capacity count check (10 enrollments, capacity 10)
                     .mockReturnValueOnce({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockResolvedValue({ count: 10, error: null })
                         })
                     })
                     // 3. Waitlist count check (2 on waitlist)
                     .mockReturnValueOnce({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockResolvedValue({ count: 2, error: null })
                         })
                     }),
                 insert: vi.fn().mockReturnValue({
                     select: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { id: 'enrollment-2', status: 'waitlisted', waitlist_position: 3 }, error: null })
                     })
                 })
             };

             mockSupabase.from.mockImplementation((table) => {
                 if (table === 'family_members') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                  single: vi.fn().mockResolvedValue({ data: mockMember, error: null })
                             })
                         })
                     })
                 };
                 if (table === 'enrollments') return enrollmentsBuilder;
                 if (table === 'classes') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             single: vi.fn().mockResolvedValue({ data: mockClass, error: null })
                         })
                     })
                 };
                 if (table === 'class_blocks') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 single: vi.fn().mockResolvedValue({ data: null, error: null })
                             })
                         })
                     })
                 };
                 return {};
             });

             const result = await enrollStudent({ classId: 'class-1', familyMemberId: 'child-1' });
             expect(result.status).toBe('waitlisted');
        });

        it('blocks enrollment if student is blocked', async () => {
             const enrollmentsBuilder = {
                 select: vi.fn()
                     // 1. Existing check
                     .mockReturnValueOnce({
                          eq: vi.fn().mockReturnValue({
                              eq: vi.fn().mockReturnValue({
                                   single: vi.fn().mockResolvedValue({ data: null, error: null })
                              })
                          })
                     })
             };

             mockSupabase.from.mockImplementation((table) => {
                 if (table === 'family_members') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                  single: vi.fn().mockResolvedValue({ data: mockMember, error: null })
                             })
                         })
                     })
                 };
                 if (table === 'enrollments') return enrollmentsBuilder;
                 if (table === 'classes') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             single: vi.fn().mockResolvedValue({ data: mockClass, error: null })
                         })
                     })
                 };
                 if (table === 'class_blocks') return {
                     select: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             eq: vi.fn().mockReturnValue({
                                 single: vi.fn().mockResolvedValue({ data: { id: 'block-1' }, error: null }) // Block detected
                             })
                         })
                     })
                 };
                 return {};
             });

             const result = await enrollStudent({ classId: 'class-1', familyMemberId: 'child-1' });
             expect(result.status).toBe('blocked');
             expect(result.error).toContain('blocked');
        });
    });
});
