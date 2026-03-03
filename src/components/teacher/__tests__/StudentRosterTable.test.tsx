import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentRosterTable } from '../StudentRosterTable';
import type { RosterEnrollment } from '@/lib/actions/enrollments';

// Mock server actions
vi.mock('@/lib/actions/enrollments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/actions/enrollments')>();
  return { ...actual, updateDepositPaid: vi.fn() };
});
vi.mock('@/lib/actions/blocking', () => ({
  unblockStudentByStudentId: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnrollment(
  overrides: Partial<RosterEnrollment> & { status: string }
): RosterEnrollment {
  const id = overrides.id || `enr-${Math.random()}`;
  return {
    id,
    class_id: 'class-1',
    student_id: `student-${id}`,
    status: overrides.status,
    waitlist_position: overrides.waitlist_position ?? null,
    deposit_paid: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    student: {
      id: `student-${id}`,
      first_name: 'Test',
      last_name: 'Student',
      parent_id: 'parent-1',
      relationship: 'Student',
      email: null,
      created_at: '2025-01-01T00:00:00Z',
      parent: {
        first_name: 'Parent',
        last_name: 'User',
        email: 'parent@test.com',
        phone: '555-0100',
      },
    },
    isBlocked: false,
    ...overrides,
  } as unknown as RosterEnrollment;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StudentRosterTable', () => {
  describe('status badges', () => {
    it('renders distinct labels for confirmed, pending, and waitlisted', () => {
      const enrollments = [
        makeEnrollment({ id: 'e1', status: 'confirmed' }),
        makeEnrollment({ id: 'e2', status: 'pending' }),
        makeEnrollment({ id: 'e3', status: 'waitlisted' }),
      ];

      render(
        <StudentRosterTable enrollments={enrollments} classId="class-1" />
      );

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Enrolled')).toBeInTheDocument();
      expect(screen.getByText('Waitlist')).toBeInTheDocument();
    });

    it('shows "Confirmed" badge for confirmed enrollments', () => {
      render(
        <StudentRosterTable
          enrollments={[makeEnrollment({ id: 'e1', status: 'confirmed' })]}
          classId="class-1"
        />
      );

      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.queryByText('Enrolled')).not.toBeInTheDocument();
    });

    it('shows "Enrolled" badge for pending enrollments', () => {
      render(
        <StudentRosterTable
          enrollments={[makeEnrollment({ id: 'e1', status: 'pending' })]}
          classId="class-1"
        />
      );

      expect(screen.getByText('Enrolled')).toBeInTheDocument();
      expect(screen.queryByText('Confirmed')).not.toBeInTheDocument();
    });

    it('shows "Waitlist" badge for waitlisted enrollments', () => {
      render(
        <StudentRosterTable
          enrollments={[
            makeEnrollment({
              id: 'e1',
              status: 'waitlisted',
              waitlist_position: 1,
            }),
          ]}
          classId="class-1"
        />
      );

      expect(screen.getByText('Waitlist')).toBeInTheDocument();
    });
  });

  it('shows empty state when no enrollments', () => {
    render(<StudentRosterTable enrollments={[]} classId="class-1" />);
    expect(screen.getByText('No students enrolled yet.')).toBeInTheDocument();
  });
});
