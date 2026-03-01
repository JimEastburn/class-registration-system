import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  blockStudent, unblockStudent, unblockStudentByStudentId, getBlockedStudents,
} from '@/lib/actions/blocking';
import {
  seedFake,
  TEACHER_PROFILE,
  ADMIN_PROFILE,
  PARENT_PROFILE,
  type SeedProfile,
  type SeedBlock,
  type SeedClass,
  type SeedEnrollment,
  type SeedFamilyMember,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const otherTeacher: SeedProfile = {
  id: 'other-teacher', first_name: 'Other', last_name: 'Teacher',
  role: 'teacher', email: 'other@test.com',
};

const studentMember: SeedFamilyMember = {
  id: 'student-123', parent_id: 'parent-123',
  first_name: 'Bad', last_name: 'Student', email: 'student@test.com', relationship: 'Student',
};

const teacherClass: SeedClass = {
  id: 'class-1', name: 'Math 101', teacher_id: 'teacher-123', status: 'published',
};

const existingBlock: SeedBlock = {
  id: 'block-123', teacher_id: 'teacher-123', student_id: 'student-123',
  reason: 'Disruptive', created_by: 'teacher-123', created_at: '2026-01-01T00:00:00Z',
};

const otherTeacherBlock: SeedBlock = {
  id: 'block-other', teacher_id: 'other-teacher', student_id: 'student-123',
  reason: null, created_by: 'other-teacher', created_at: '2026-01-01T00:00:00Z',
};

const activeEnrollment: SeedEnrollment = {
  id: 'enr-1', student_id: 'student-123', class_id: 'class-1', status: 'confirmed',
};

const allProfiles = [TEACHER_PROFILE, otherTeacher, ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[];

function seed(
  authUserId: string | null,
  overrides: Record<string, Record<string, unknown>[]> = {},
) {
  return seedFake({
    authUserId,
    data: {
      profiles: allProfiles,
      class_blocks: [] as Record<string, unknown>[],
      classes: [teacherClass] as unknown as Record<string, unknown>[],
      enrollments: [] as Record<string, unknown>[],
      family_members: [studentMember] as unknown as Record<string, unknown>[],
      ...overrides,
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Blocking Actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('blockStudent', () => {
    it('should fail if user is not authenticated', async () => {
      seed(null);
      expect(await blockStudent('student-123')).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should fail if user is not a teacher or admin', async () => {
      seed('parent-123');
      expect(await blockStudent('student-123')).toEqual({ success: false, error: 'Only teachers can block students' });
    });

    it('should fail if student is already blocked', async () => {
      seed('teacher-123', { class_blocks: [existingBlock] as unknown as Record<string, unknown>[] });
      expect(await blockStudent('student-123')).toEqual({ success: false, error: 'Student is already blocked' });
    });

    it('should successfully block a student', async () => {
      const fake = seed('teacher-123');
      expect(await blockStudent('student-123', 'Disruptive')).toEqual({ success: true, error: null });
      expect(fake.db.class_blocks).toHaveLength(1);
      expect(fake.db.class_blocks[0].student_id).toBe('student-123');
      expect(fake.db.class_blocks[0].reason).toBe('Disruptive');
    });

    it('should successfully block and cancel existing enrollments', async () => {
      const fake = seed('teacher-123', { enrollments: [activeEnrollment] as unknown as Record<string, unknown>[] });
      expect(await blockStudent('student-123', 'Disruptive')).toEqual({ success: true, error: null });
      expect(fake.db.class_blocks).toHaveLength(1);
      expect(fake.db.enrollments.find((e) => e.id === 'enr-1')?.status).toBe('cancelled');
    });
  });

  describe('unblockStudent', () => {
    it('should fail if user is not authenticated', async () => {
      seed(null);
      expect(await unblockStudent('block-123')).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should fail if block is not found', async () => {
      seed('teacher-123');
      expect(await unblockStudent('nonexistent')).toEqual({ success: false, error: 'Block not found' });
    });

    it('should fail if teacher tries to remove another teachers block', async () => {
      seed('teacher-123', { class_blocks: [otherTeacherBlock] as unknown as Record<string, unknown>[] });
      expect(await unblockStudent('block-other')).toEqual({ success: false, error: 'Access denied' });
    });

    it('should successfully unblock a student', async () => {
      const fake = seed('teacher-123', { class_blocks: [existingBlock] as unknown as Record<string, unknown>[] });
      expect(await unblockStudent('block-123')).toEqual({ success: true, error: null });
      expect(fake.db.class_blocks).toHaveLength(0);
    });
  });

  describe('unblockStudentByStudentId', () => {
    it('should fail if user is not authenticated', async () => {
      seed(null);
      expect(await unblockStudentByStudentId('student-123')).toEqual({ success: false, error: 'Not authenticated' });
    });

    it('should fail if no block exists', async () => {
      seed('teacher-123');
      expect(await unblockStudentByStudentId('student-123')).toEqual({ success: false, error: 'Block not found' });
    });

    it('should successfully unblock by student ID', async () => {
      const fake = seed('teacher-123', { class_blocks: [existingBlock] as unknown as Record<string, unknown>[] });
      expect(await unblockStudentByStudentId('student-123')).toEqual({ success: true, error: null });
      expect(fake.db.class_blocks).toHaveLength(0);
    });
  });

  describe('getBlockedStudents', () => {
    it('should fail if user is not authenticated', async () => {
      seed(null);
      expect(await getBlockedStudents()).toEqual({ data: null, error: 'Not authenticated' });
    });

    it('should return blocked students for the teacher', async () => {
      seed('teacher-123', { class_blocks: [existingBlock] as unknown as Record<string, unknown>[] });
      const result = await getBlockedStudents();
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('block-123');
    });
  });
});
