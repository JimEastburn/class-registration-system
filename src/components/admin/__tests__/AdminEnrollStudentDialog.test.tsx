import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminEnrollStudentDialog } from '../AdminEnrollStudentDialog';
import {
  adminEnrollStudent,
  getAdminEnrollmentStudentOptions,
  getAdminEnrollmentClassOptions,
} from '@/lib/actions/enrollments';
import { toast } from 'sonner';

// Shared mock router so component and test see the same functions
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}));

// Mock server actions
vi.mock('@/lib/actions/enrollments', () => ({
  adminEnrollStudent: vi.fn(),
  getAdminEnrollmentStudentOptions: vi.fn(),
  getAdminEnrollmentClassOptions: vi.fn(),
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Next.js router with shared instance
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return {
    ...actual,
    useRouter: () => mockRouter,
  };
});

describe('AdminEnrollStudentDialog', () => {
  const mockStudents = [
    {
      id: 'student-1',
      first_name: 'Alice',
      last_name: 'Anderson',
      email: 'alice@test.com',
      parent_name: 'Parent One',
    },
    {
      id: 'student-2',
      first_name: 'Bob',
      last_name: 'Baker',
      email: 'bob@test.com',
      parent_name: null,
    },
  ];

  const mockClasses = [
    {
      id: 'class-1',
      name: 'Painting 101',
      teacher_name: 'Ms. Smith',
      day: 'Tuesday',
      block: '1',
    },
    {
      id: 'class-2',
      name: 'Pottery Advanced',
      teacher_name: null,
      day: null,
      block: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getAdminEnrollmentStudentOptions as Mock).mockResolvedValue({
      data: mockStudents,
      error: null,
    });
    (getAdminEnrollmentClassOptions as Mock).mockResolvedValue({
      data: mockClasses,
      error: null,
    });
  });

  it('opens the dialog from the Enroll Student button', async () => {
    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));

    expect(
      await screen.findByRole('heading', { name: /enroll student/i })
    ).toBeInTheDocument();
  });

  it('loads student and class options when opened', async () => {
    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));

    await waitFor(() => {
      expect(getAdminEnrollmentStudentOptions).toHaveBeenCalled();
      expect(getAdminEnrollmentClassOptions).toHaveBeenCalled();
    });

    // Verify options are rendered in the native selects
    expect(
      await screen.findByText('Alice Anderson (Parent One)')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Painting 101 - Ms. Smith (Tuesday 1)')
    ).toBeInTheDocument();
  });

  it('disables submit until both student and class are selected', async () => {
    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    expect(submitBtn).toBeDisabled();
  });

  it('calls adminEnrollStudent with selected IDs and shows pending success', async () => {
    (adminEnrollStudent as Mock).mockResolvedValue({
      data: { id: 'enrollment-1' },
      status: 'pending',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    // Select student and class using native select change events
    fireEvent.change(screen.getByTestId('student-select'), {
      target: { value: 'student-1' },
    });
    fireEvent.change(screen.getByTestId('class-select'), {
      target: { value: 'class-1' },
    });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminEnrollStudent).toHaveBeenCalledWith({
        studentId: 'student-1',
        classId: 'class-1',
      });
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/pending|enrolled/i)
    );
  });

  it('shows waitlist success when class is full', async () => {
    (adminEnrollStudent as Mock).mockResolvedValue({
      data: { id: 'enrollment-2' },
      status: 'waitlisted',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    fireEvent.change(screen.getByTestId('student-select'), {
      target: { value: 'student-1' },
    });
    fireEvent.change(screen.getByTestId('class-select'), {
      target: { value: 'class-2' },
    });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/waitlist/i)
      );
    });
  });

  it('shows reactivated success when a cancelled enrollment is reactivated', async () => {
    (adminEnrollStudent as Mock).mockResolvedValue({
      data: { id: 'enrollment-3' },
      status: 'reactivated',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    fireEvent.change(screen.getByTestId('student-select'), {
      target: { value: 'student-2' },
    });
    fireEvent.change(screen.getByTestId('class-select'), {
      target: { value: 'class-1' },
    });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/reactivated/i)
      );
    });
  });

  it('shows error message on failure', async () => {
    (adminEnrollStudent as Mock).mockResolvedValue({
      data: null,
      status: null,
      error: 'Student is blocked from this class',
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    fireEvent.change(screen.getByTestId('student-select'), {
      target: { value: 'student-1' },
    });
    fireEvent.change(screen.getByTestId('class-select'), {
      target: { value: 'class-1' },
    });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Student is blocked from this class'
      );
    });
  });

  it('refreshes the router on success', async () => {
    (adminEnrollStudent as Mock).mockResolvedValue({
      data: { id: 'enrollment-1' },
      status: 'pending',
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    fireEvent.change(screen.getByTestId('student-select'), {
      target: { value: 'student-1' },
    });
    fireEvent.change(screen.getByTestId('class-select'), {
      target: { value: 'class-1' },
    });

    const submitBtn = screen.getByRole('button', { name: /enroll/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('shows specific error toast when student options fail to load', async () => {
    (getAdminEnrollmentStudentOptions as Mock).mockResolvedValue({
      data: null,
      error: 'Ambiguous FK',
    });
    (getAdminEnrollmentClassOptions as Mock).mockResolvedValue({
      data: mockClasses,
      error: null,
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load students: Ambiguous FK');
    });
  });

  it('shows specific error toast when class options fail to load', async () => {
    (getAdminEnrollmentStudentOptions as Mock).mockResolvedValue({
      data: mockStudents,
      error: null,
    });
    (getAdminEnrollmentClassOptions as Mock).mockResolvedValue({
      data: null,
      error: 'Network error',
    });

    render(<AdminEnrollStudentDialog />);

    fireEvent.click(screen.getByRole('button', { name: /enroll student/i }));
    await screen.findByRole('heading', { name: /enroll student/i });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load classes: Network error');
    });
  });
});
