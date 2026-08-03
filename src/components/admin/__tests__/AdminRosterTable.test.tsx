import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminRosterTable from '../AdminRosterTable';
import type { RosterEnrollment } from '@/lib/actions/enrollments';

vi.mock('@/lib/actions/enrollments', () => ({
  cancelEnrollment: vi.fn(),
}));

vi.mock('@/lib/actions/waitlist', () => ({
  promoteWaitlistEntryAsAdmin: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function buildEnrollment(
  id: string,
  firstName: string,
  student: Partial<RosterEnrollment['student']>
): RosterEnrollment {
  return {
    id,
    class_id: 'class-1',
    student_id: `student-${id}`,
    status: 'confirmed',
    waitlist_position: null,
    student: {
      id: `student-${id}`,
      first_name: firstName,
      last_name: 'Student',
      email: `${firstName.toLowerCase()}@example.com`,
      relationship: 'Student',
      grade: 'elementary',
      dob: null,
      age: null,
      parent_id: 'parent-1',
      student_user_id: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      parent: {
        first_name: 'Pat',
        last_name: 'Parent',
        email: 'pat@example.com',
        phone: '555-0100',
      },
      student_user: null,
      ...student,
    },
  } as unknown as RosterEnrollment;
}

function ageFor(name: string): string {
  const row = screen.getByText(`${name} Student`).closest('tr')!;
  return within(row).getByTestId('roster-age-cell').textContent!;
}

describe('AdminRosterTable', () => {
  it('shows the age recorded for each student, from whichever source has it', () => {
    const today = new Date();
    const tenYearsAgo = new Date(
      today.getFullYear() - 10,
      today.getMonth(),
      today.getDate()
    ).toISOString();

    render(
      <AdminRosterTable
        classId="class-1"
        enrollments={[
          // Age entered by a parent on the family member
          buildEnrollment('1', 'Ada', { age: 14 }),
          // Age entered by the student when they registered their own account
          buildEnrollment('2', 'Blair', { student_user: { age: 16 } }),
          // Family member age wins over the linked account age
          buildEnrollment('3', 'Cruz', { age: 12, student_user: { age: 16 } }),
          // A date of birth is not an age source
          buildEnrollment('4', 'Dana', { dob: tenYearsAgo }),
          // Nothing on record
          buildEnrollment('5', 'Eze', {}),
        ]}
      />
    );

    expect(ageFor('Ada')).toBe('14');
    expect(ageFor('Blair')).toBe('16');
    expect(ageFor('Cruz')).toBe('12');
    expect(ageFor('Dana')).toBe('—');
    expect(ageFor('Eze')).toBe('—');
  });
});
