import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server dependencies before importing component
vi.mock('@/lib/actions/classes', () => ({
  getClassDetails: vi.fn(),
}));

vi.mock('@/lib/actions/enrollments', () => ({
  getClassRoster: vi.fn(),
}));

vi.mock('@/components/admin/AdminRosterTable', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-roster-table" />,
}));

import AdminClassDetailPage from '../[id]/page';
import { getClassDetails } from '@/lib/actions/classes';
import { getClassRoster } from '@/lib/actions/enrollments';

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: `enr-${Math.random().toString(36).slice(2)}`,
    student_id: `student-${Math.random().toString(36).slice(2)}`,
    class_id: 'test-class-id',
    status: 'confirmed',
    waitlist_position: null,
    created_at: new Date().toISOString(),
    student: {
      id: 'student-1',
      first_name: 'Test',
      last_name: 'Student',
      parent: { first_name: 'Parent', last_name: 'Test', email: 'p@test.com', phone: null },
    },
    ...overrides,
  };
}

const mockClass = {
  id: 'test-class-id',
  name: 'Art 101',
  capacity: 10,
  status: 'published',
  description: 'A test class',
  price: 30,
  day: 'Tuesday',
  block: 'Block 1',
  start_date: '2026-01-01',
  end_date: '2026-06-01',
  teacher: { first_name: 'Teacher', last_name: 'Test', email: 'teacher@test.com' },
} as unknown as Awaited<ReturnType<typeof getClassDetails>>['data'];

describe('AdminClassDetailPage Stats', () => {
  it('Enrolled Students shows confirmed + pending, excludes waitlisted', async () => {
    const enrollments = [
      ...Array.from({ length: 5 }, () => makeEnrollment({ status: 'confirmed' })),
      ...Array.from({ length: 3 }, () => makeEnrollment({ status: 'pending' })),
      ...Array.from({ length: 2 }, () => makeEnrollment({ status: 'waitlisted', waitlist_position: 1 })),
    ];

    vi.mocked(getClassDetails).mockResolvedValue({ data: mockClass, error: null });
    vi.mocked(getClassRoster).mockResolvedValue({ data: enrollments as never, error: null });

    const page = await AdminClassDetailPage({ params: Promise.resolve({ id: 'test-class-id' }), searchParams: Promise.resolve({}) });
    render(page);

    // 5 confirmed + 3 pending = 8 enrolled; 2 waitlisted should NOT count
    expect(screen.getByText('Enrolled Students:')).toBeInTheDocument();
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
  });

  it('Waitlisted stat shows only waitlisted count', async () => {
    const enrollments = [
      ...Array.from({ length: 8 }, () => makeEnrollment({ status: 'confirmed' })),
      ...Array.from({ length: 3 }, () => makeEnrollment({ status: 'waitlisted', waitlist_position: 1 })),
    ];

    vi.mocked(getClassDetails).mockResolvedValue({ data: mockClass, error: null });
    vi.mocked(getClassRoster).mockResolvedValue({ data: enrollments as never, error: null });

    const page = await AdminClassDetailPage({ params: Promise.resolve({ id: 'test-class-id' }), searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText('Waitlisted:')).toBeInTheDocument();
    // Find the waitlisted count — should be 3
    const waitlistedLabel = screen.getByText('Waitlisted:');
    const waitlistedValue = waitlistedLabel.closest('div')?.querySelector('.text-xl');
    expect(waitlistedValue?.textContent?.trim()).toBe('3');
  });
});

describe('AdminClassDetailPage back link', () => {
  beforeEach(() => {
    vi.mocked(getClassDetails).mockResolvedValue({ data: mockClass, error: null });
    vi.mocked(getClassRoster).mockResolvedValue({ data: [], error: null });
  });

  it('returns to the list page the admin came from', async () => {
    const page = await AdminClassDetailPage({
      params: Promise.resolve({ id: 'test-class-id' }),
      searchParams: Promise.resolve({ page: '2', limit: '10', search: 'Art' }),
    });
    render(page);

    expect(screen.getByRole('link', { name: /back to classes/i })).toHaveAttribute(
      'href',
      '/admin/classes?page=2&limit=10&search=Art'
    );
  });

  it('returns to the plain list when there is no list state', async () => {
    const page = await AdminClassDetailPage({
      params: Promise.resolve({ id: 'test-class-id' }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByRole('link', { name: /back to classes/i })).toHaveAttribute(
      'href',
      '/admin/classes'
    );
  });
});
