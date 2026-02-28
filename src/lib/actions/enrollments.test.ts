import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollStudent, updateDepositPaid } from '@/lib/actions/enrollments';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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
  const mockMember = {
    id: 'child-1',
    parent_id: 'parent-123',
    first_name: 'Kid',
    last_name: 'Test',
    relationship: 'Student',
  };
  const mockClass = {
    id: 'class-1',
    capacity: 10,
    teacher_id: 'teacher-1',
    schedule_config: { day: 'Tuesday', block: 'Block 1', recurring: true },
    teacher: { first_name: 'Teacher', last_name: 'One' },
  };

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
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Default: registration is open (system_settings returns null)
    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return {};
    });
  });

  // Helper: builds the enrollments table mock with call counting
  // Call order in enrollStudent:
  //   1. select('id, status') — existing enrollment check
  //   2. select('class_id, classes:class_id (...)') — schedule conflict query
  //   3. select('*', { count: 'exact', head: true }) — capacity count
  //   4. (optional) select('*', { count: 'exact', head: true }) — waitlist count
  function buildEnrollmentsMock(opts: {
    existingEnrollment?: any;
    studentEnrollments?: any[];
    confirmedCount?: number;
    waitlistCount?: number;
    insertResult?: any;
  }) {
    const callCount = { select: 0 };
    return {
      select: vi.fn().mockImplementation(() => {
        callCount.select++;
        if (callCount.select === 1) {
          // 1. Existing enrollment check
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: opts.existingEnrollment ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (callCount.select === 2) {
          // 2. Schedule conflict query
          return {
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: opts.studentEnrollments ?? [],
                error: null,
              }),
            }),
          };
        }
        if (callCount.select === 3) {
          // 3. Capacity count check
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: opts.confirmedCount ?? 0,
                error: null,
              }),
            }),
          };
        }
        if (callCount.select === 4) {
          // 4. Waitlist count check
          return {
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: opts.waitlistCount ?? 0,
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: opts.insertResult ?? {
              id: 'enrollment-1',
              status: 'pending',
            },
            error: null,
          }),
        }),
      }),
    };
  }

  function setupFromMock(
    enrollmentsMock: any,
    classOverride?: any,
    blockOverride?: any
  ) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'family_members')
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockMember, error: null }),
              }),
            }),
          }),
        };
      if (table === 'enrollments') return enrollmentsMock;
      if (table === 'classes')
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: classOverride ?? mockClass,
                error: null,
              }),
            }),
          }),
        };
      if (table === 'class_blocks')
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: blockOverride ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      return {};
    });
  }

  describe('enrollStudent', () => {
    it('enrolls successfully if space available', async () => {
      const enrollmentsMock = buildEnrollmentsMock({
        confirmedCount: 5,
      });
      setupFromMock(enrollmentsMock);

      const result = await enrollStudent({
        classId: 'class-1',
        familyMemberId: 'child-1',
      });

      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
    });

    it('waitlists if class is full', async () => {
      const enrollmentsMock = buildEnrollmentsMock({
        confirmedCount: 10, // Full (capacity=10)
        waitlistCount: 2,
        insertResult: {
          id: 'enrollment-2',
          status: 'waitlisted',
          waitlist_position: 3,
        },
      });
      setupFromMock(enrollmentsMock);

      const result = await enrollStudent({
        classId: 'class-1',
        familyMemberId: 'child-1',
      });
      expect(result.status).toBe('waitlisted');
    });

    it('blocks enrollment if student is blocked', async () => {
      const enrollmentsMock = buildEnrollmentsMock({});
      setupFromMock(enrollmentsMock, undefined, { id: 'block-1' });

      const result = await enrollStudent({
        classId: 'class-1',
        familyMemberId: 'child-1',
      });
      expect(result.status).toBe('blocked');
      expect(result.error).toContain('blocked');
    });

    it('rejects enrollment when student has a schedule conflict', async () => {
      const enrollmentsMock = buildEnrollmentsMock({
        studentEnrollments: [
          {
            class_id: 'other-class',
            classes: {
              id: 'other-class',
              name: 'Art 101',
              status: 'published',
              schedule_config: {
                day: 'Tuesday',
                block: 'Block 1',
                recurring: true,
              },
            },
          },
        ],
      });
      setupFromMock(enrollmentsMock);

      const result = await enrollStudent({
        classId: 'class-1',
        familyMemberId: 'child-1',
      });
      expect(result.status).toBe('schedule_conflict');
      expect(result.error).toContain('Schedule conflict');
      expect(result.error).toContain('Art 101');
      expect(result.error).toContain('Kid');
    });

    it('allows enrollment when existing class is on different day/block', async () => {
      const enrollmentsMock = buildEnrollmentsMock({
        studentEnrollments: [
          {
            class_id: 'other-class',
            classes: {
              id: 'other-class',
              name: 'Music',
              status: 'published',
              schedule_config: {
                day: 'Wednesday',
                block: 'Block 3',
                recurring: true,
              },
            },
          },
        ],
        confirmedCount: 5,
      });
      setupFromMock(enrollmentsMock);

      const result = await enrollStudent({
        classId: 'class-1',
        familyMemberId: 'child-1',
      });
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
    });
  });

  describe('updateDepositPaid', () => {
    it('returns error when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await updateDepositPaid('enrollment-1', true, 'class-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when class not found', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateDepositPaid('enrollment-1', true, 'class-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Class not found');
    });

    it('returns access denied when user is not teacher or admin', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { teacher_id: 'other-teacher' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'parent' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateDepositPaid('enrollment-1', true, 'class-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('updates deposit_paid successfully when user is the teacher', async () => {
      // User is the teacher of the class
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'teacher-1' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { teacher_id: 'teacher-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'teacher' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Admin client for the actual update
      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'enrollments') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateDepositPaid('enrollment-1', true, 'class-1');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('updates deposit_paid successfully when user is an admin', async () => {
      // User is an admin but NOT the teacher
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'classes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { teacher_id: 'other-teacher' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockAdminSupabase.from.mockImplementation((table: string) => {
        if (table === 'enrollments') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await updateDepositPaid('enrollment-1', false, 'class-1');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});
