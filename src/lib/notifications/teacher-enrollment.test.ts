import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  sendTeacherEnrollmentNotification,
  sendTeacherUnenrollmentNotification,
} from '@/lib/email';
import {
  notifyTeacherOfEnrollment,
  notifyTeacherOfUnenrollment,
} from './teacher-enrollment';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendTeacherEnrollmentNotification: vi
    .fn()
    .mockResolvedValue({ success: true }),
  sendTeacherUnenrollmentNotification: vi
    .fn()
    .mockResolvedValue({ success: true }),
}));

type Row = Record<string, unknown> | null;

// Minimal admin-client stand-in: resolves the classes/family_members lookups
// the helper performs (.from(table).select().eq().maybeSingle()).
function makeAdmin(classRow: Row, studentRow: Row) {
  return {
    from(table: string) {
      const row = table === 'classes' ? classRow : studentRow;
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  };
}

const TEACHER_CLASS = {
  name: 'Art 101',
  teacher: { email: 't@x.com', first_name: 'Ada', last_name: 'Lovelace' },
};
const STUDENT = { first_name: 'Kid', last_name: 'Test' };

const EXPECTED = {
  teacherEmail: 't@x.com',
  teacherName: 'Ada Lovelace',
  studentName: 'Kid Test',
  className: 'Art 101',
};

describe('teacher enrollment notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifyTeacherOfEnrollment sends a mapped notification', async () => {
    vi.mocked(createClient).mockReturnValue(
      makeAdmin(TEACHER_CLASS, STUDENT) as never
    );

    await notifyTeacherOfEnrollment('class-1', 'student-1');

    expect(sendTeacherEnrollmentNotification).toHaveBeenCalledWith(EXPECTED);
  });

  it('notifyTeacherOfUnenrollment sends a mapped notification', async () => {
    vi.mocked(createClient).mockReturnValue(
      makeAdmin(TEACHER_CLASS, STUDENT) as never
    );

    await notifyTeacherOfUnenrollment('class-1', 'student-1');

    expect(sendTeacherUnenrollmentNotification).toHaveBeenCalledWith(EXPECTED);
  });

  it('skips sending when the teacher has no email', async () => {
    vi.mocked(createClient).mockReturnValue(
      makeAdmin({ name: 'Art 101', teacher: null }, STUDENT) as never
    );

    await notifyTeacherOfEnrollment('class-1', 'student-1');

    expect(sendTeacherEnrollmentNotification).not.toHaveBeenCalled();
  });

  it('never throws when the lookup fails (best-effort)', async () => {
    vi.mocked(createClient).mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(
      notifyTeacherOfEnrollment('class-1', 'student-1')
    ).resolves.toBeUndefined();
    expect(sendTeacherEnrollmentNotification).not.toHaveBeenCalled();
  });
});
