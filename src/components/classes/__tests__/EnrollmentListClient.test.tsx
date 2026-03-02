import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { EnrollmentListClient } from '../EnrollmentListClient';

// Mock server action
vi.mock('@/lib/actions/enrollments', () => ({
  cancelEnrollment: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock EnrollmentCalendarGrid
vi.mock('../EnrollmentCalendarGrid', () => ({
  EnrollmentCalendarGrid: ({ enrollments }: { enrollments: unknown[] }) => (
    <div data-testid="enrollment-calendar-grid">{enrollments.length} enrollments</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnrollment(overrides: {
  id: string;
  className: string;
  studentName: string;
  teacherFirst?: string;
  teacherLast?: string;
  day?: string;
  block?: string;
  ageMin?: number | null;
  ageMax?: number | null;
}) {
  const [studentFirst, ...rest] = overrides.studentName.split(' ');
  const studentLast = rest.join(' ') || 'Doe';

  return {
    id: overrides.id,
    class_id: `class-${overrides.id}`,
    student_id: `student-${overrides.id}`,
    status: 'confirmed' as const,
    waitlist_position: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deposit_paid: false,
    class: {
      id: `class-${overrides.id}`,
      name: overrides.className,
      teacher_id: 'teacher-1',
      price: 30,
      day: overrides.day || null,
      block: overrides.block || null,
      location: 'Room 101',
      schedule_config: overrides.day ? { day: overrides.day, block: overrides.block || 'Block 1', recurring: true } : null,
      teacher: {
        first_name: overrides.teacherFirst || 'Jane',
        last_name: overrides.teacherLast || 'Smith',
      },
      age_min: overrides.ageMin ?? null,
      age_max: overrides.ageMax ?? null,
    },
    student: {
      id: `student-${overrides.id}`,
      first_name: studentFirst,
      last_name: studentLast,
    },
  };
}

const ENROLLMENTS = [
  makeEnrollment({ id: 'e1', className: 'Elementary Art', studentName: 'Alice Jones', teacherFirst: 'Bob', teacherLast: 'Ross', day: 'Monday', block: 'Block 1', ageMin: 6, ageMax: 11 }),
  makeEnrollment({ id: 'e2', className: 'Middle School Science', studentName: 'Charlie Brown', day: 'Tuesday', block: 'Block 2', ageMin: 11, ageMax: 14 }),
  makeEnrollment({ id: 'e3', className: 'AP Chemistry', studentName: 'Diana Prince', day: 'Wednesday', block: 'Block 3', ageMin: 14, ageMax: 18 }),
  makeEnrollment({ id: 'e4', className: 'All Ages Music', studentName: 'Eve Green', day: 'Thursday', block: 'Block 4', ageMin: null, ageMax: null }),
];

function renderComponent() {
  return render(<EnrollmentListClient enrollments={ENROLLMENTS} />);
}

function getSearchInput(): HTMLInputElement {
  return screen.getByTestId('enrollment-search-input') as HTMLInputElement;
}

function getAgeInput(): HTMLInputElement {
  return screen.getByTestId('enrollment-age-input') as HTMLInputElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnrollmentListClient filter bar', () => {
  // Search tests
  describe('search filter', () => {
    it('renders the search input', () => {
      renderComponent();
      expect(getSearchInput()).toBeInTheDocument();
    });

    it('filters by class name', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Elementary' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();
    });

    it('filters by teacher name', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Bob Ross' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();
    });

    it('filters by student name', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Charlie' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();
    });

    it('filters by day', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Monday' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();
    });

    it('clears search when X button is clicked', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Elementary' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(screen.queryByText(/enrollment found/)).not.toBeInTheDocument();
    });
  });

  // Age filter tests
  describe('age filter', () => {
    it('renders the age stepper', () => {
      renderComponent();
      expect(screen.getByText("Child's age")).toBeInTheDocument();
      expect(getAgeInput()).toBeInTheDocument();
    });

    it('filters enrollments by age (age 8 matches Elementary Art + All Ages)', () => {
      renderComponent();
      fireEvent.change(getAgeInput(), { target: { value: '8' } });
      expect(screen.getByText(/2 enrollments found/)).toBeInTheDocument();
    });

    it('increment and decrement buttons skip between 0 and 5', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('enrollment-age-increment'));
      expect(getAgeInput().value).toBe('5');

      fireEvent.click(screen.getByTestId('enrollment-age-decrement'));
      expect(getAgeInput().value).toBe('0');
    });
  });

  // Combined filter tests
  describe('combined filters', () => {
    it('applies both search and age filters together', () => {
      renderComponent();
      // Set age to 8 → Elementary Art + All Ages Music
      fireEvent.change(getAgeInput(), { target: { value: '8' } });
      // Then search for "Music" → only All Ages Music
      fireEvent.change(getSearchInput(), { target: { value: 'Music' } });
      expect(screen.getByText(/1 enrollment found/)).toBeInTheDocument();
    });
  });

  // Calendar integration
  describe('calendar view with filters', () => {
    it('passes filtered enrollments to calendar grid', () => {
      renderComponent();
      fireEvent.change(getSearchInput(), { target: { value: 'Elementary' } });
      // Switch to calendar view
      fireEvent.click(screen.getByTestId('view-toggle-calendar'));
      expect(screen.getByTestId('enrollment-calendar-grid')).toHaveTextContent('1 enrollments');
    });
  });
});
