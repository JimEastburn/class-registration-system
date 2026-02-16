
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollStudent } from '@/lib/actions/enrollments';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
    logAuditAction: vi.fn(),
}));

describe('Enrollment Actions', () => {
    const mockUser = { id: 'parent-123' };
    const mockMember = { id: 'child-1', parent_id: 'parent-123', first_name: 'Kid', last_name: 'Test', relationship: 'Student' };
    const mockClass = { id: 'class-1', capacity: 10, teacher_id: 'teacher-1', teacher: { first_name: 'Teacher', last_name: 'One' } };

    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    const mockAdminSupabase = {
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as any).mockResolvedValue(mockSupabase);
        (createAdminClient as any).mockResolvedValue(mockAdminSupabase);
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

        // Default: registration is open (system_settings returns null)
        mockAdminSupabase.from.mockImplementation((table: string) => {
            if (table === 'system_settings') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                        })
                    })
                };
            }
            return {};
        });
    });

    describe('enrollStudent', () => {
        it('enrolls successfully if space available', async () => {
             const enrollmentsCallCount = { select: 0 };
             const enrollmentsBuilder = {
                 select: vi.fn().mockImplementation((...args: unknown[]) => {
                     enrollmentsCallCount.select++;
                     if (enrollmentsCallCount.select === 1) {
                         // 1. Existing enrollment check: .select('id, status').eq().eq().in().limit().maybeSingle()
                         return {
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockReturnValue({
                                     in: vi.fn().mockReturnValue({
                                         limit: vi.fn().mockReturnValue({
                                             maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                                         })
                                     })
                                 })
                             })
                         };
                     }
                     if (enrollmentsCallCount.select === 2) {
                         // 2. Capacity count check: .select('*', { count: 'exact', head: true }).eq().eq()
                         return {
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockResolvedValue({ count: 5, error: null })
                             })
                         };
                     }
                     return {};
                 }),
                 insert: vi.fn().mockReturnValue({
                     select: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { id: 'enrollment-1', status: 'pending' }, error: null })
                     })
                 })
             };

             mockSupabase.from.mockImplementation((table: string) => {
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
             const enrollmentsCallCount = { select: 0 };
             const enrollmentsBuilder = {
                 select: vi.fn().mockImplementation((...args: unknown[]) => {
                     enrollmentsCallCount.select++;
                     if (enrollmentsCallCount.select === 1) {
                         // 1. Existing enrollment check
                         return {
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockReturnValue({
                                     in: vi.fn().mockReturnValue({
                                         limit: vi.fn().mockReturnValue({
                                             maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                                         })
                                     })
                                 })
                             })
                         };
                     }
                     if (enrollmentsCallCount.select === 2) {
                         // 2. Capacity count check (10 enrollments = FULL)
                         return {
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockResolvedValue({ count: 10, error: null })
                             })
                         };
                     }
                     if (enrollmentsCallCount.select === 3) {
                         // 3. Waitlist count check (2 on waitlist)
                         return {
                             eq: vi.fn().mockReturnValue({
                                 eq: vi.fn().mockResolvedValue({ count: 2, error: null })
                             })
                         };
                     }
                     return {};
                 }),
                 insert: vi.fn().mockReturnValue({
                     select: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { id: 'enrollment-2', status: 'waitlisted', waitlist_position: 3 }, error: null })
                     })
                 })
             };

             mockSupabase.from.mockImplementation((table: string) => {
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
                 select: vi.fn().mockReturnValue({
                     // 1. Existing enrollment check
                     eq: vi.fn().mockReturnValue({
                         eq: vi.fn().mockReturnValue({
                             in: vi.fn().mockReturnValue({
                                 limit: vi.fn().mockReturnValue({
                                     maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                                 })
                             })
                         })
                     })
                 }),
             };

             mockSupabase.from.mockImplementation((table: string) => {
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
