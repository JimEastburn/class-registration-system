import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ClassManagementTable } from '../ClassManagementTable';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/actions/classes', () => ({
  deleteClass: vi.fn(),
  cancelClass: vi.fn(),
  completeClass: vi.fn(),
}));

const makeClass = (overrides = {}) => ({
  id: 'cls-1',
  teacher_id: 'teacher-1',
  name: 'Art 101',
  description: 'Intro to art',
  capacity: 20,
  price: 30,
  location: 'Room 204',
  schedule_config: null,
  status: 'published' as const,
  day: 'Monday',
  block: 'Block 1',
  start_date: '2026-03-01',
  end_date: '2026-06-01',
  age_min: 6,
  age_max: 12,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  teacher: { id: 'teacher-1', first_name: 'Jane', last_name: 'Doe' },
  enrolled_count: 15,
  ...overrides,
});

describe('ClassManagementTable', () => {
  it('renders Classroom, Enrolled, and Ages column headers', () => {
    render(<ClassManagementTable classes={[makeClass()]} />);

    expect(screen.getByText('Classroom')).toBeInTheDocument();
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Ages')).toBeInTheDocument();
  });

  it('displays the location value in the Classroom column', () => {
    render(<ClassManagementTable classes={[makeClass({ location: 'Room 204' })]} />);

    expect(screen.getByText('Room 204')).toBeInTheDocument();
  });

  it('displays "—" when location is null', () => {
    render(<ClassManagementTable classes={[makeClass({ location: null })]} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('displays enrolled count as "X / Y" format', () => {
    render(
      <ClassManagementTable
        classes={[makeClass({ enrolled_count: 15, capacity: 20 })]}
      />
    );

    expect(screen.getByText('15 / 20')).toBeInTheDocument();
  });

  it('displays age range as "min – max" format', () => {
    render(
      <ClassManagementTable
        classes={[makeClass({ age_min: 6, age_max: 12 })]}
      />
    );

    expect(screen.getByText('6 – 12')).toBeInTheDocument();
  });

  it('displays "All Ages" when both age_min and age_max are null', () => {
    render(
      <ClassManagementTable
        classes={[makeClass({ age_min: null, age_max: null })]}
      />
    );

    expect(screen.getByText('All Ages')).toBeInTheDocument();
  });

  it('displays partial age range when only one age is set', () => {
    render(
      <ClassManagementTable
        classes={[makeClass({ age_min: 5, age_max: null })]}
      />
    );

    expect(screen.getByText('5+')).toBeInTheDocument();
  });
});
