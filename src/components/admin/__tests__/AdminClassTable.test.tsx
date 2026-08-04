import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminClassTable from '../AdminClassTable';
import type { ClassWithTeacherAndCount } from '@/lib/actions/classes';

// Mock server action
vi.mock('@/lib/actions/classes', () => ({
  adminDeleteClass: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Shared mock router
const mockReplace = vi.fn();
const mockPush = vi.fn();

// Mutable so tests can render the table as if the URL already carried a sort.
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams.current,
  usePathname: () => '/admin/classes',
}));

const mockClasses: ClassWithTeacherAndCount[] = [
  {
    id: 'class-1',
    name: 'Elementary Math',
    description: 'Fun math for kids',
    teacher_id: 'teacher-1',
    teacher: {
      id: 'teacher-1',
      first_name: 'Deanna',
      last_name: 'Smith',
      email: 'deanna@test.com',
    },
    status: 'published',
    capacity: 18,
    price: 30,
    current_enrollment: 5,
    age_min: 6,
    age_max: 10,
    location: 'Room 101',
    day_of_week: 'Tuesday',
    day: 'Tuesday',
    block: 'Block 1',
    start_time: null,
    end_time: null,
    start_date: '2026-09-01',
    end_date: '2026-12-15',
    schedule_config: {
      day: 'Tuesday',
      block: 'Block 1',
      recurring: true,
      startDate: '2026-09-01',
      endDate: '2026-12-15',
    },
    age_display_mode: 'both',
    schedule_display_mode: 'day_block',
    show_payment_info: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    enrolled_count: 5,
    pending_count: 2,
    confirmed_count: 3,
    waitlisted_count: 4,
  },
  {
    id: 'class-2',
    name: 'Advanced Science',
    description: 'Deep science concepts',
    teacher_id: 'teacher-2',
    teacher: {
      id: 'teacher-2',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@test.com',
    },
    status: 'draft',
    capacity: 25,
    price: 30,
    current_enrollment: 0,
    age_min: 12,
    age_max: 18,
    location: 'Room 202',
    day_of_week: 'Thursday',
    day: 'Thursday',
    block: 'Block 2',
    start_time: null,
    end_time: null,
    start_date: '2026-09-01',
    end_date: '2026-12-15',
    schedule_config: {
      day: 'Thursday',
      block: 'Block 2',
      recurring: true,
      startDate: '2026-09-01',
      endDate: '2026-12-15',
    },
    age_display_mode: 'both',
    schedule_display_mode: 'day_block',
    show_payment_info: true,
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
    enrolled_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    waitlisted_count: 0,
  },
];

describe('AdminClassTable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockReplace.mockClear();
    mockPush.mockClear();
    mockSearchParams.current = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders class data correctly', () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    expect(screen.getByText('Elementary Math')).toBeInTheDocument();
    expect(screen.getByText('Deanna Smith')).toBeInTheDocument();
    expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows enrolled and waitlisted counts for each class', () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    expect(
      screen.getByRole('columnheader', { name: /enrolled/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /waitlisted/i })
    ).toBeInTheDocument();

    // Elementary Math: 5 of 18 seats filled, 4 waiting
    const mathRow = screen.getByText('Elementary Math').closest('tr')!;
    expect(mathRow).toHaveTextContent('5 / 18');
    expect(mathRow).toHaveTextContent('4');

    // Advanced Science: nobody enrolled or waiting
    const scienceRow = screen.getByText('Advanced Science').closest('tr')!;
    expect(scienceRow).toHaveTextContent('0 / 25');
  });

  it('does not show clear button when search is empty', () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    expect(screen.queryByTestId('class-search-clear')).not.toBeInTheDocument();
  });

  it('debounces search and updates URL after 300ms', async () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    const input = screen.getByTestId('class-search-input');
    fireEvent.change(input, { target: { value: 'Dea' } });

    // Immediately after typing, URL should NOT be updated
    expect(mockReplace).not.toHaveBeenCalled();

    // After 300ms, URL should be updated
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/classes?search=Dea&page=1'
      );
    });
  });

  it('clears search when X button is clicked', async () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    const input = screen.getByTestId('class-search-input');
    fireEvent.change(input, { target: { value: 'Math' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/classes?search=Math&page=1'
      );
    });

    mockReplace.mockClear();

    const clearButton = screen.getByTestId('class-search-clear');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/classes?page=1');
    });

    expect(input).toHaveValue('');
  });

  it('resets page to 1 when search term changes', async () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={40}
        currentPage={2}
        limit={20}
      />
    );

    const input = screen.getByTestId('class-search-input');
    fireEvent.change(input, { target: { value: 'Science' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/classes?search=Science&page=1'
      );
    });
  });

  it('triggers search with a single character', async () => {
    render(
      <AdminClassTable
        initialClasses={mockClasses}
        total={2}
        currentPage={1}
        limit={20}
      />
    );

    const input = screen.getByTestId('class-search-input');
    fireEvent.change(input, { target: { value: 'M' } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        '/admin/classes?search=M&page=1'
      );
    });
  });

  describe('block column', () => {
    it('shows the scheduled block for each class', () => {
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={2}
          currentPage={1}
          limit={20}
        />
      );

      expect(
        screen.getByRole('columnheader', { name: /block/i })
      ).toBeInTheDocument();

      const mathRow = screen.getByText('Elementary Math').closest('tr')!;
      expect(mathRow).toHaveTextContent('Block 1');

      const scienceRow = screen.getByText('Advanced Science').closest('tr')!;
      expect(scienceRow).toHaveTextContent('Block 2');
    });

    it('falls back to schedule_config when the block column is unset', () => {
      const legacy = [
        { ...mockClasses[0], block: null },
      ] as ClassWithTeacherAndCount[];

      render(
        <AdminClassTable
          initialClasses={legacy}
          total={1}
          currentPage={1}
          limit={20}
        />
      );

      const row = screen.getByText('Elementary Math').closest('tr')!;
      expect(row).toHaveTextContent('Block 1');
    });

    it('shows TBD for a class that has not been scheduled yet', () => {
      const unscheduled = [
        { ...mockClasses[1], block: null, schedule_config: null },
      ] as ClassWithTeacherAndCount[];

      render(
        <AdminClassTable
          initialClasses={unscheduled}
          total={1}
          currentPage={1}
          limit={20}
        />
      );

      const row = screen.getByText('Advanced Science').closest('tr')!;
      expect(row).toHaveTextContent('TBD');
    });

    it('shows Asynchronous instead of a block for asynchronous classes', () => {
      const asynchronous = [
        {
          ...mockClasses[0],
          schedule_display_mode: 'asynchronous',
        },
      ] as ClassWithTeacherAndCount[];

      render(
        <AdminClassTable
          initialClasses={asynchronous}
          total={1}
          currentPage={1}
          limit={20}
        />
      );

      const row = screen.getByText('Elementary Math').closest('tr')!;
      expect(row).toHaveTextContent('Asynchronous');
      expect(row).not.toHaveTextContent('Block 1');
    });
  });

  describe('rows per page', () => {
    it('shows the current page size', () => {
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={100}
          currentPage={1}
          limit={50}
        />
      );

      expect(
        screen.getByRole('combobox', { name: /rows per page/i })
      ).toHaveTextContent('50');
    });

    it('is available even when there is only one page of results', () => {
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={2}
          currentPage={1}
          limit={20}
        />
      );

      expect(
        screen.getByRole('combobox', { name: /rows per page/i })
      ).toBeInTheDocument();
    });

    it('offers the supported page sizes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={2}
          currentPage={1}
          limit={20}
        />
      );

      await user.click(
        screen.getByRole('combobox', { name: /rows per page/i })
      );

      const options = (await screen.findAllByRole('option')).map(
        (opt) => opt.textContent
      );
      expect(options).toEqual(['10', '20', '50', '100']);
    });

    it('updates the URL and returns to page 1 when the page size changes', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={100}
          currentPage={3}
          limit={20}
        />
      );

      await user.click(
        screen.getByRole('combobox', { name: /rows per page/i })
      );
      await user.click(await screen.findByRole('option', { name: '50' }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin/classes?limit=50&page=1');
      });
    });

    it('keeps the active search and sort when the page size changes', async () => {
      mockSearchParams.current = new URLSearchParams(
        'search=Math&sort=enrolled&dir=desc&page=2'
      );
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={100}
          currentPage={2}
          limit={20}
        />
      );

      await user.click(
        screen.getByRole('combobox', { name: /rows per page/i })
      );
      await user.click(await screen.findByRole('option', { name: '10' }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?search=Math&sort=enrolled&dir=desc&page=1&limit=10'
        );
      });
    });
  });

  describe('row action links', () => {
    it('carries the list state so returning lands on the same page', () => {
      mockSearchParams.current = new URLSearchParams(
        'search=Math&sort=enrolled&dir=desc&page=2&limit=10'
      );
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={100}
          currentPage={2}
          limit={10}
        />
      );

      expect(
        screen.getByRole('link', { name: /view elementary math/i })
      ).toHaveAttribute(
        'href',
        '/admin/classes/class-1?page=2&limit=10&search=Math&sort=enrolled&dir=desc'
      );
      expect(
        screen.getByRole('link', { name: /edit elementary math/i })
      ).toHaveAttribute(
        'href',
        '/admin/classes/class-1/edit?page=2&limit=10&search=Math&sort=enrolled&dir=desc'
      );
    });

    it('links plainly when the list is in its default state', () => {
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={2}
          currentPage={1}
          limit={20}
        />
      );

      expect(
        screen.getByRole('link', { name: /view advanced science/i })
      ).toHaveAttribute('href', '/admin/classes/class-2');
    });
  });

  describe('column sorting', () => {
    const renderTable = () =>
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={2}
          currentPage={1}
          limit={20}
        />
      );

    it.each([
      ['Class Name', 'name'],
      ['Teacher', 'teacher'],
      ['Block', 'block'],
      ['Status', 'status'],
      ['Enrolled', 'enrolled'],
      ['Waitlisted', 'waitlisted'],
      ['Min Age', 'age_min'],
      ['Max Age', 'age_max'],
    ])('sorts by %s ascending on first click', async (label, key) => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTable();

      await user.click(
        screen.getByRole('button', {
          name: new RegExp(`sort by ${label}`, 'i'),
        })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/admin/classes?sort=${key}&dir=asc&page=1`
        );
      });
    });

    it('toggles to descending when the active column is clicked again', async () => {
      mockSearchParams.current = new URLSearchParams('sort=name&dir=asc');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTable();

      await user.click(
        screen.getByRole('button', { name: /sort by class name/i })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?sort=name&dir=desc&page=1'
        );
      });
    });

    it('toggles back to ascending from descending', async () => {
      mockSearchParams.current = new URLSearchParams('sort=name&dir=desc');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTable();

      await user.click(
        screen.getByRole('button', { name: /sort by class name/i })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?sort=name&dir=asc&page=1'
        );
      });
    });

    it('starts a newly picked column at ascending', async () => {
      mockSearchParams.current = new URLSearchParams('sort=name&dir=desc');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTable();

      await user.click(
        screen.getByRole('button', { name: /sort by enrolled/i })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?sort=enrolled&dir=asc&page=1'
        );
      });
    });

    it('returns to page 1 so a re-sort cannot strand the reader mid-list', async () => {
      mockSearchParams.current = new URLSearchParams('page=4');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <AdminClassTable
          initialClasses={mockClasses}
          total={100}
          currentPage={4}
          limit={20}
        />
      );

      await user.click(
        screen.getByRole('button', { name: /sort by class name/i })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?page=1&sort=name&dir=asc'
        );
      });
    });

    it('keeps the current search when sorting', async () => {
      mockSearchParams.current = new URLSearchParams('search=Math');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderTable();

      await user.click(
        screen.getByRole('button', { name: /sort by class name/i })
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/admin/classes?search=Math&sort=name&dir=asc&page=1'
        );
      });
    });

    it('marks only the active column with aria-sort', () => {
      mockSearchParams.current = new URLSearchParams('sort=enrolled&dir=desc');
      renderTable();

      expect(
        screen.getByRole('columnheader', { name: /enrolled/i })
      ).toHaveAttribute('aria-sort', 'descending');
      expect(
        screen.getByRole('columnheader', { name: /class name/i })
      ).not.toHaveAttribute('aria-sort');
    });

    it('reports ascending on the active column when sorted ascending', () => {
      mockSearchParams.current = new URLSearchParams('sort=name&dir=asc');
      renderTable();

      expect(
        screen.getByRole('columnheader', { name: /class name/i })
      ).toHaveAttribute('aria-sort', 'ascending');
    });

    it('leaves derived columns unsortable', () => {
      renderTable();

      expect(
        screen.queryByRole('button', { name: /sort by conflict/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /sort by actions/i })
      ).not.toBeInTheDocument();
    });

    it('ignores an unknown sort column in the URL', () => {
      mockSearchParams.current = new URLSearchParams('sort=nonsense&dir=desc');
      renderTable();

      const headers = screen.getAllByRole('columnheader');
      expect(headers.some((h) => h.hasAttribute('aria-sort'))).toBe(false);
    });
  });
});
