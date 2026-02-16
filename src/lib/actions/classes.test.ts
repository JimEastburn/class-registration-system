
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createClass, updateClass } from '@/lib/actions/classes';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/actions/audit', () => ({
    logAuditAction: vi.fn(),
}));

// Mock Email
vi.mock('@/lib/email', () => ({
    sendClassCancellation: vi.fn(),
    sendScheduleChangeNotification: vi.fn(),
}));

// Mock scheduling logic
vi.mock('@/lib/logic/scheduling', () => ({
    validateScheduleConfig: vi.fn().mockReturnValue({ valid: true }),
    checkScheduleConflict: vi.fn().mockReturnValue(null),
}));

// Mock calendar logic
vi.mock('@/lib/logic/calendar', () => ({
    generateClassEvents: vi.fn().mockReturnValue([]),
}));

describe('Class Actions', () => {
    const mockUser = { id: 'teacher-1' };
    
    const mockSupabase = {
        auth: {
            getUser: vi.fn(),
        },
        from: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (createClient as Mock).mockResolvedValue(mockSupabase);
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    });

    describe('createClass', () => {
        it('allows teacher to create draft class', async () => {
             // Mock Role Check: profiles
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                     })
                 })
             });

             // Mock Insert: classes → .insert().select().single()
             mockSupabase.from.mockReturnValueOnce({
                 insert: vi.fn().mockReturnValue({
                     select: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { id: 'class-new', schedule_config: null, location: null, description: null }, error: null })
                     })
                 })
             });

             const input = {
                 name: 'Math 101',
                 price: 10000,
                 capacity: 20
             };

             const result = await createClass(input);
             
             if (result.success) {
                 expect(result.data.classId).toBe('class-new');
             } else {
                 throw new Error(`Expected success but got error: ${result.error}`);
             }
        });

        it('correctly maps schedule config to columns', async () => {
             // Mock Role Check
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                     })
                 })
             });

             // Mock teacher conflict check: classes → .select().eq().in()
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         in: vi.fn().mockResolvedValue({ data: [], error: null })
                     })
                 })
             });

             const mockInsert = vi.fn().mockReturnValue({
                 select: vi.fn().mockReturnValue({
                     single: vi.fn().mockResolvedValue({ data: { id: 'class-schedule-test', schedule_config: { day: 'Tuesday', block: 'Block 2 (10:00 AM - 11:00 AM)', startDate: '2025-01-01', endDate: '2025-05-31' }, location: null, description: null }, error: null })
                 })
             });

             // Mock Insert
             mockSupabase.from.mockReturnValueOnce({
                 insert: mockInsert
             });

             const input = {
                 name: 'Math 101',
                 price: 10000,
                 capacity: 20,
                 schedule_config: {
                     day: 'Tuesday',
                     block: 'Block 2 (10:00 AM - 11:00 AM)',
                     startDate: '2025-01-01',
                     endDate: '2025-05-31'
                 }
             };

             // @ts-expect-error - complex union type on schedule_config day/block
             await createClass(input);
             
             expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                 day: 'Tuesday',
                 block: 'Block 2 (10:00 AM - 11:00 AM)',
                 start_date: '2025-01-01',
                 end_date: '2025-05-31',
                 schedule_config: expect.objectContaining({
                     day: 'Tuesday'
                 })
             }));
        });

        it('denies parent role', async () => {
             // Mock Role Check
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'parent' }, error: null })
                     })
                 })
             });

             const input = {
                 name: 'Math 101',
                 price: 10000,
                 capacity: 20
             };

             const result = await createClass(input);
             if (!result.success) {
                  expect(result.error).toContain('Not authorized');
             } else {
                  throw new Error('Expected failure');
             }
        });
    });

    describe('updateClass', () => {
        it('allows owner to update class', async () => {
             // Mock Existing Class Check (expanded select columns)
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { teacher_id: 'teacher-1', status: 'draft', name: 'Math 101', location: null, schedule_config: null, start_date: null, end_date: null }, error: null })
                     })
                 })
             });

             // Mock Role Check
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                     })
                 })
             });

             // Mock Update
             mockSupabase.from.mockReturnValueOnce({
                 update: vi.fn().mockReturnValue({
                     eq: vi.fn().mockResolvedValue({ error: null })
                 })
             });

             const result = await updateClass('class-1', { name: 'Math 102' });
             expect(result.success).toBe(true);
        });

        it('denies non-owner (if not admin) to update class', async () => {
             // Mock Existing Class Check (owned by teacher-2)
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { teacher_id: 'teacher-2', status: 'draft', name: 'Math 101', location: null, schedule_config: null, start_date: null, end_date: null }, error: null })
                     })
                 })
             });

             // Mock Role Check (current user is teacher-1)
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                     })
                 })
             });

             const result = await updateClass('class-1', { name: 'Math 102' });
             if (!result.success) {
                expect(result.error).toContain('Not authorized');
             } else {
                 throw new Error('Expected failure');
             }
        });

        it('allows clearing location (setting to null)', async () => {
            // Mock Existing Class Check
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { 
                             teacher_id: 'teacher-1', 
                             status: 'draft',
                             name: 'Math 101',
                             location: 'Old Location',
                             schedule_config: null,
                             start_date: null,
                             end_date: null
                         }, error: null })
                     })
                 })
             });

             // Mock Role Check
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { role: 'teacher' }, error: null })
                     })
                 })
             });

             const mockUpdate = vi.fn().mockReturnValue({
                 eq: vi.fn().mockResolvedValue({ error: null })
             });

             // Mock Update
             mockSupabase.from.mockReturnValueOnce({
                 update: mockUpdate
             });

             // Mock calendar_events delete for location change (delete future events)
             mockSupabase.from.mockReturnValueOnce({
                 delete: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         gte: vi.fn().mockResolvedValue({ error: null })
                     })
                 })
             });

             // Mock re-fetch updated class for calendar regeneration
             mockSupabase.from.mockReturnValueOnce({
                 select: vi.fn().mockReturnValue({
                     eq: vi.fn().mockReturnValue({
                         single: vi.fn().mockResolvedValue({ data: { 
                             id: 'class-1',
                             schedule_config: null,
                             location: null,
                             description: null
                         }, error: null })
                     })
                 })
             });

             // Type now allows null, so no error expected
             const result = await updateClass('class-1', { location: null });
             
             expect(result.success).toBe(true);
             expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                 location: null
             }));
        });
    });
});
