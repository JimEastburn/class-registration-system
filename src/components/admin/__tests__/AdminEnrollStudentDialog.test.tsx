import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AdminEnrollStudentDialog } from '../AdminEnrollStudentDialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const mockRefresh = vi.fn();

// Mock ResizeObserver for Radix UI Popover
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/actions/enrollments', () => ({
  adminEnrollStudent: vi.fn(),
  getAdminEnrollmentStudentOptions: vi.fn(),
  getAdminEnrollmentClassOptions: vi.fn(),
}));

import {
  adminEnrollStudent,
  getAdminEnrollmentStudentOptions,
  getAdminEnrollmentClassOptions,
} from '@/lib/actions/enrollments';

describe('AdminEnrollStudentDialog', () => {
  const mockStudents = [
    {
      id: 's1',
      first_name: 'Alice',
      last_name: 'Smith',
      parent_name: 'Bob Smith',
    },
    {
      id: 's2',
      first_name: 'Charlie',
      last_name: 'Brown',
      parent_name: 'Dana Brown',
    },
  ];

  const mockClasses = [
    { id: 'c1', name: 'Art 101', teacher_name: 'Ms. Johnson' },
    { id: 'c2', name: 'Math 202', teacher_name: 'Mr. Lee' },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    (
      getAdminEnrollmentStudentOptions as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      data: mockStudents,
      error: null,
    });
    (
      getAdminEnrollmentClassOptions as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      data: mockClasses,
      error: null,
    });
  });

  it('dialog opens from Enroll Student button', async () => {
    const user = userEvent.setup();
    render(<AdminEnrollStudentDialog />);

    const button = screen.getByRole('button', { name: /enroll student/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/enroll student in class/i)).toBeInTheDocument();
  });

  it('loads student and class options', async () => {
    const user = userEvent.setup();
    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    await waitFor(() => {
      expect(getAdminEnrollmentStudentOptions).toHaveBeenCalled();
      expect(getAdminEnrollmentClassOptions).toHaveBeenCalled();
    });
  });

  it('disables submit until both student and class are selected', async () => {
    const user = userEvent.setup();
    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    const submitButton = screen.getByRole('button', { name: /enroll$/i });
    expect(submitButton).toBeDisabled();
  });

  it('calls adminEnrollStudent with selected IDs and shows pending success', async () => {
    const user = userEvent.setup();
    (adminEnrollStudent as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'e1' },
      status: 'pending',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    // Open student selector and pick first student
    await user.click(screen.getByRole('combobox', { name: /student/i }));
    await user.click(screen.getByText('Alice Smith'));

    // Open class selector and pick first class
    await user.click(screen.getByRole('combobox', { name: /class/i }));
    await user.click(screen.getByText('Art 101'));

    const submitButton = screen.getByRole('button', { name: /enroll$/i });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(adminEnrollStudent).toHaveBeenCalledWith({
        studentId: 's1',
        classId: 'c1',
      });
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('pending')
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows waitlist success when class is full', async () => {
    const user = userEvent.setup();
    (adminEnrollStudent as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'e2' },
      status: 'waitlisted',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    await user.click(screen.getByRole('combobox', { name: /student/i }));
    await user.click(screen.getByText('Charlie Brown'));

    await user.click(screen.getByRole('combobox', { name: /class/i }));
    await user.click(screen.getByText('Math 202'));

    await user.click(screen.getByRole('button', { name: /enroll$/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('waitlist')
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows reactivated success for previously cancelled enrollment', async () => {
    const user = userEvent.setup();
    (adminEnrollStudent as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'e3' },
      status: 'reactivated',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    await user.click(screen.getByRole('combobox', { name: /student/i }));
    await user.click(screen.getByText('Alice Smith'));

    await user.click(screen.getByRole('combobox', { name: /class/i }));
    await user.click(screen.getByText('Art 101'));

    await user.click(screen.getByRole('button', { name: /enroll$/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('reactivated')
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('shows error message on failure', async () => {
    const user = userEvent.setup();
    (adminEnrollStudent as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      status: null,
      error: 'Student is blocked from this class',
    });

    render(<AdminEnrollStudentDialog />);

    await user.click(screen.getByRole('button', { name: /enroll student/i }));

    await user.click(screen.getByRole('combobox', { name: /student/i }));
    await user.click(screen.getByText('Alice Smith'));

    await user.click(screen.getByRole('combobox', { name: /class/i }));
    await user.click(screen.getByText('Art 101'));

    await user.click(screen.getByRole('button', { name: /enroll$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Student is blocked from this class'
      );
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
