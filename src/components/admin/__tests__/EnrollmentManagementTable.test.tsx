import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EnrollmentManagementTable } from '../EnrollmentManagementTable';
import type {
  AdminEnrollmentStatusCounts,
  AdminEnrollmentView,
} from '@/lib/actions/enrollments';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams.current,
  usePathname: () => '/admin/enrollments',
}));

vi.mock('@/lib/actions/enrollments', () => ({
  adminRemoveEnrollment: vi.fn(),
}));

vi.mock('../AdminEnrollStudentDialog', () => ({
  AdminEnrollStudentDialog: () => <button>Add enrollment</button>,
}));

vi.mock('../CancelEnrollmentDialog', () => ({
  CancelEnrollmentDialog: () => null,
}));

const statusCounts: AdminEnrollmentStatusCounts = {
  confirmed: 12,
  pending: 3,
  waitlisted: 4,
  cancelled: 5,
};

const waitlistedEnrollment = {
  id: 'enrollment-1',
  student_id: 'student-1',
  class_id: 'class-1',
  status: 'waitlisted',
  waitlist_position: 3,
  created_at: '2026-08-25T15:00:00.000Z',
  updated_at: '2026-08-25T15:00:00.000Z',
  deposit_paid: false,
  student: {
    id: 'student-1',
    first_name: 'Jordan',
    last_name: 'Lee',
    parent: { first_name: 'Casey', last_name: 'Lee' },
  },
  class: {
    id: 'class-1',
    name: 'Robotics',
    teacher_id: 'teacher-1',
    price: 50,
  },
} as unknown as AdminEnrollmentView;

const paidEnrollment = {
  ...waitlistedEnrollment,
  id: 'enrollment-paid',
  status: 'confirmed',
  waitlist_position: null,
  updated_at: '2026-08-26T15:00:00.000Z',
  status_change: {
    from: 'pending',
    to: 'confirmed',
    changed_at: '2026-08-26T15:00:00.000Z',
  },
} as AdminEnrollmentView;

const cancelledEnrollment = {
  ...waitlistedEnrollment,
  id: 'enrollment-cancelled',
  status: 'cancelled',
  waitlist_position: null,
  updated_at: '2026-08-27T15:00:00.000Z',
  status_change: {
    from: 'pending',
    to: 'cancelled',
    changed_at: '2026-08-27T15:00:00.000Z',
  },
} as AdminEnrollmentView;

function renderTable(
  overrides: Partial<
    React.ComponentProps<typeof EnrollmentManagementTable>
  > = {}
) {
  return render(
    <EnrollmentManagementTable
      enrollments={[waitlistedEnrollment]}
      matchingCount={1}
      statusCounts={statusCounts}
      currentPage={1}
      totalPages={1}
      pageSize={20}
      filterError={null}
      {...overrides}
    />
  );
}

describe('EnrollmentManagementTable', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockSearchParams.current = new URLSearchParams();
  });

  it('shows all status totals, seat-holding guidance, and precise record wording', () => {
    renderTable();

    expect(
      screen.getByRole('button', { name: /Confirmed and paid: 12/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Pending: 3/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Waitlisted: 4/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cancelled: 5/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Confirmed and pending enrollments hold seats/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Enrollment date' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Status change' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Changed on' })
    ).toBeInTheDocument();
    expect(screen.getByText('#3 on Waitlist')).toBeInTheDocument();
    expect(
      screen.getByText('Showing 1–1 of 1 matching record')
    ).toBeInTheDocument();
  });

  it('shows pending-to-paid and pending-to-cancelled transitions with their change dates', () => {
    renderTable({
      enrollments: [paidEnrollment, cancelledEnrollment],
      matchingCount: 2,
    });

    expect(screen.getByLabelText('Pending to Paid')).toBeInTheDocument();
    expect(screen.getByLabelText('Pending to Cancelled')).toBeInTheDocument();
    expect(screen.getByText('8/26/2026')).toBeInTheDocument();
    expect(screen.getByText('8/27/2026')).toBeInTheDocument();
  });

  it('filters from a status card and toggles the selected card back to all statuses', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTable();

    await user.click(screen.getByRole('button', { name: /Pending: 3/i }));
    expect(mockReplace).toHaveBeenCalledWith(
      '/admin/enrollments?status=pending&page=1'
    );

    unmount();
    mockReplace.mockReset();
    mockSearchParams.current = new URLSearchParams('status=pending&page=2');
    renderTable();

    const pendingCard = screen.getByRole('button', { name: /Pending: 3/i });
    expect(pendingCard).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('combobox', { name: 'Filter by status' })
    ).toHaveTextContent('Pending');

    await user.click(pendingCard);
    expect(mockReplace).toHaveBeenCalledWith('/admin/enrollments?page=1');
  });

  it('applies inclusive status-activity URL filters and resets pagination', async () => {
    const user = userEvent.setup();
    mockSearchParams.current = new URLSearchParams('page=3&status=waitlisted');
    renderTable();

    fireEvent.change(screen.getByLabelText('Activity from'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Activity through'), {
      target: { value: '2026-08-31' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    const destination = mockReplace.mock.calls[0][0] as string;
    const url = new URL(destination, 'https://example.test');
    expect(url.searchParams.get('startDate')).toBe('2026-08-01');
    expect(url.searchParams.get('endDate')).toBe('2026-08-31');
    expect(url.searchParams.get('status')).toBe('waitlisted');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('shows a local date error and does not navigate for a reversed range', async () => {
    const user = userEvent.setup();
    renderTable();

    fireEvent.change(screen.getByLabelText('Activity from'), {
      target: { value: '2026-08-31' },
    });
    fireEvent.change(screen.getByLabelText('Activity through'), {
      target: { value: '2026-08-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Start date must be on or before end date.'
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('clears all visible filters and offers recovery from a filtered empty state', async () => {
    const user = userEvent.setup();
    mockSearchParams.current = new URLSearchParams(
      'search=Jordan&status=cancelled&startDate=2026-08-01&endDate=2026-08-31&page=2'
    );
    renderTable({ enrollments: [], matchingCount: 0, totalPages: 0 });

    expect(
      screen.getByRole('button', {
        name: 'Clear filters and show all enrollments',
      })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Clear filters and show all enrollments',
      })
    );
    expect(mockReplace).toHaveBeenCalledWith('/admin/enrollments?page=1');
  });
});
