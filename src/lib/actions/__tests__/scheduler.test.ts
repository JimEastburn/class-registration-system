import { describe, it, expect, vi, beforeEach, type Mock, type Mocked } from 'vitest';
import { updateClassSchedule } from '../scheduler';
import { createClient } from '@/lib/supabase/server';
import { checkScheduleOverlap } from '../classes';
import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('../classes', () => ({
    checkScheduleOverlap: vi.fn(),
}));

describe('Scheduler Server Actions', () => {
    let mockSupabase: Mocked<SupabaseClient<Database>>;
    let mockFrom: Mock;
    let mockSelect: Mock;
    let mockUpdate: Mock;
    let mockEq: Mock;
    let mockSingle: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        mockUpdate = vi.fn().mockReturnThis();
        mockEq = vi.fn().mockReturnThis();
        mockSingle = vi.fn();
        mockSelect = vi.fn().mockReturnThis();

        mockFrom = vi.fn(() => ({
            select: mockSelect,
            update: mockUpdate,
            eq: mockEq,
            single: mockSingle,
        }));

        mockSupabase = {
            auth: {
                getUser: vi.fn(),
            },
            from: mockFrom,
        } as unknown as Mocked<SupabaseClient<Database>>;

        (createClient as Mock).mockResolvedValue(mockSupabase);
    });

    describe('updateClassSchedule', () => {
        it('should return error if not authenticated', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: null },
                error: null
            });

            const result = await updateClassSchedule('class-1', '10:00', 'Tuesday', 'Tuesday');
            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('should return error if not authorized (parent)', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'parent' } } },
                error: null
            });

            const result = await updateClassSchedule('class-1', '10:00', 'Tuesday', 'Tuesday');
            expect(result).toEqual({ error: 'Not authorized to reschedule classes' });
        });

        it('should return error if class not found', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            mockSingle.mockResolvedValue({ data: null, error: 'Not found' });

            const result = await updateClassSchedule('class-1', '10:00', 'Tuesday', 'Tuesday');
            expect(result).toEqual({ error: 'Class not found' });
        });

        it('should return error if overlap detected', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            // Mock class found
            mockSingle.mockResolvedValue({
                data: {
                    id: 'class-1',
                    teacher_id: 'teacher-1',
                    recurrence_days: ['Tuesday'],
                    recurrence_duration: 60,
                    start_date: '2024-01-01',
                    end_date: '2024-02-01'
                },
                error: null
            });

            // Mock overlap check failure
            (checkScheduleOverlap as Mock).mockResolvedValue('Overlap detected');

            const result = await updateClassSchedule('class-1', '10:00', 'Tuesday', 'Tuesday');
            expect(result).toEqual({ error: 'Overlap detected' });
            expect(checkScheduleOverlap).toHaveBeenCalled();
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('should update time if Valid', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'class_scheduler' } } },
                error: null
            });

            // Mock class found
            mockSingle.mockResolvedValue({
                data: {
                    id: 'class-1',
                    teacher_id: 'teacher-1',
                    recurrence_pattern: 'weekly',
                    recurrence_days: ['Tuesday', 'Thursday'], // Logic check: multi-day
                    recurrence_duration: 60,
                    start_date: '2024-01-01',
                    end_date: '2024-02-01'
                },
                error: null
            });

            // Mock overlap check success
            (checkScheduleOverlap as Mock).mockResolvedValue(null);

            // Mock update success
            mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

            const result = await updateClassSchedule('class-1', '14:00', 'Tuesday', 'Tuesday');

            expect(result).toEqual({ success: true });
            
            // Re-construct checks
            expect(checkScheduleOverlap).toHaveBeenCalledWith(
                mockSupabase,
                'teacher-1',
                expect.objectContaining({
                    recurrenceTime: '14:00',
                    recurrenceDays: ['tuesday', 'thursday']
                }),
                'class-1'
            );

            expect(mockFrom).toHaveBeenCalledWith('classes');
            expect(mockUpdate).toHaveBeenCalledWith({ 
                recurrence_time: '14:00',
                recurrence_days: ['tuesday', 'thursday'],
                schedule: 'Weekly on Tuesday, Thursday at 2:00 PM'
            });
            expect(revalidatePath).toHaveBeenCalledWith('/class_scheduler/schedule');
        });

        it('should update day if changed', async () => {
            (mockSupabase.auth.getUser as Mock).mockResolvedValue({
                data: { user: { user_metadata: { role: 'admin' } } },
                error: null
            });

            // Mock class found (Tue/Thu)
            mockSingle.mockResolvedValue({
                data: {
                    id: 'class-1',
                    teacher_id: 'teacher-1',
                    recurrence_pattern: 'weekly',
                    recurrence_days: ['Tuesday', 'Thursday'], 
                    recurrence_duration: 60,
                    start_date: '2024-01-01',
                    end_date: '2024-02-01'
                },
                error: null
            });

            (checkScheduleOverlap as Mock).mockResolvedValue(null);
            mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

            // Move Tue -> Wed
            const result = await updateClassSchedule('class-1', '14:00', 'Tuesday', 'Wednesday');
            
            expect(result).toEqual({ success: true });

            // Expect Tue swapped to Wed
            const expectedDays = ['wednesday', 'thursday']; // original logic downcases

            expect(checkScheduleOverlap).toHaveBeenCalledWith(
                mockSupabase,
                'teacher-1',
                expect.objectContaining({
                    recurrenceTime: '14:00',
                    recurrenceDays: expectedDays
                }),
                'class-1'
            );
            
            expect(mockUpdate).toHaveBeenCalledWith({ 
                recurrence_time: '14:00',
                recurrence_days: expectedDays,
                schedule: 'Weekly on Wednesday, Thursday at 2:00 PM'
            });
        });
    });
});
