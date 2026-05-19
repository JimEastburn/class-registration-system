import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminClassTable from '../AdminClassTable';
import { ClassWithTeacher } from '@/types';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/classes',
}));

const mockClasses: ClassWithTeacher[] = [
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
  },
];

describe('AdminClassTable', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockReplace.mockClear();
    mockPush.mockClear();
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
});
