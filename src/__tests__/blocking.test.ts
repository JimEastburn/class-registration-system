import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blockStudent, unblockStudent, unblockStudentByStudentId, getBlockedStudents } from '@/lib/actions/blocking';
import { createClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Blocking Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      delete: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      single: vi.fn(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('blockStudent', () => {
    it('should fail if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await blockStudent('student-123');
      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should fail if user is not a teacher or admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
      mockSupabase.single.mockResolvedValueOnce({ data: { role: 'parent' } }); // Profile check

      const result = await blockStudent('student-123');
      expect(result).toEqual({ success: false, error: 'Only teachers can block students' });
    });

    it('should fail if student is already blocked', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
      mockSupabase.single
        .mockResolvedValueOnce({ data: { role: 'teacher' } }) // Profile check
        .mockResolvedValueOnce({ data: { id: 'block-123' } }); // Existing block check

      const result = await blockStudent('student-123');
      expect(result).toEqual({ success: false, error: 'Student is already blocked' });
    });

    it('should successfully block a student', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
      mockSupabase.single
        .mockResolvedValueOnce({ data: { role: 'teacher' } }) // Profile check
        .mockResolvedValueOnce({ data: null }); // No existing block check
      
      mockSupabase.insert.mockReturnValue({ error: null });

      const result = await blockStudent('student-123', 'Disruptive');
      expect(result).toEqual({ success: true, error: null });
      expect(mockSupabase.from).toHaveBeenCalledWith('class_blocks');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        teacher_id: 'teacher-123',
        student_id: 'student-123',
        reason: 'Disruptive',
        created_by: 'teacher-123',
      });
    });
    it('should successfully block a student and remove existing enrollments', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
      
      // Profiles builder
      const profilesBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { role: 'teacher' } })
      };

      // Class blocks builder
      const classBlocksBuilder = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }), // Insert is terminal (await check) OR returns builder?
          // In code: await supabase.from().insert(...)
          // So insert should resolve.
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null }) // existing check
      };
      // Need to handle insert returning error: null. 
      // Insert usually returns PostgrestFilterBuilder which is awaitable.
      // So let's make insert return a then-able or just resolve
      classBlocksBuilder.insert.mockResolvedValue({ error: null });

      // Classes builder (fetching teacher classes)
      const classesBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'class-1' }] }) // Terminal eq
      };

      // Enrollments builder (cancelling)
      const enrollmentsBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          neq: vi.fn().mockResolvedValue({ error: null }) // Terminal neq
      };

      mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'profiles') return profilesBuilder;
          if (table === 'class_blocks') return classBlocksBuilder;
          if (table === 'classes') return classesBuilder;
          if (table === 'enrollments') return enrollmentsBuilder;
          return mockSupabase;
      });

      const result = await blockStudent('student-123', 'Disruptive');
      expect(result).toEqual({ success: true, error: null });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('class_blocks');
      expect(classBlocksBuilder.insert).toHaveBeenCalled();
      
      expect(mockSupabase.from).toHaveBeenCalledWith('classes');
      expect(classesBuilder.eq).toHaveBeenCalledWith('teacher_id', 'teacher-123');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
      expect(enrollmentsBuilder.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(enrollmentsBuilder.in).toHaveBeenCalledWith('class_id', ['class-1']);
    });
  });

  describe('unblockStudent', () => {
    it('should fail if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await unblockStudent('block-123');
      expect(result).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should fail if block is not found', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: 'Not found' }); // Block check

        const result = await unblockStudent('block-123');
        expect(result).toEqual({ success: false, error: 'Block not found' });
    });

    it('should fail if teacher tries to remove another teachers block', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
        mockSupabase.single
            .mockResolvedValueOnce({ data: { teacher_id: 'other-teacher' } }) // Block check
            .mockResolvedValueOnce({ data: { role: 'teacher' } }); // Admin override check

        const result = await unblockStudent('block-123');
        expect(result).toEqual({ success: false, error: 'Access denied' });
    });

    it('should successfully unblock a student', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
      mockSupabase.single.mockResolvedValueOnce({ data: { teacher_id: 'teacher-123' } }); // Block check
      
      // Fix: delete() returns a builder where eq() returns the final result
      const deleteBuilder = {
        eq: vi.fn().mockResolvedValue({ error: null })
      };
      mockSupabase.delete.mockReturnValue(deleteBuilder);

      const result = await unblockStudent('block-123');
      expect(result).toEqual({ success: true, error: null });
      expect(mockSupabase.from).toHaveBeenCalledWith('class_blocks');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'block-123');
    });
  });

  describe('getBlockedStudents', () => {
    it('should fail if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getBlockedStudents();
      expect(result).toEqual({ data: null, error: 'Not authenticated' });
    });

    it('should return blocked students for the teacher', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'teacher-123' } } });
      const mockData = [
        { id: 'block-1', student: { first_name: 'Bad', last_name: 'Student' } }
      ];
      // eq returns mockSupabase (builder), order returns valid response
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getBlockedStudents();
      expect(result).toEqual({ data: mockData, error: null });
      expect(mockSupabase.from).toHaveBeenCalledWith('class_blocks');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('teacher_id', 'teacher-123');
    });
  });
});
