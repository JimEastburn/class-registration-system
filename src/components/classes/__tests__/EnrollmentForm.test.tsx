import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnrollmentForm from '../EnrollmentForm';
import { createEnrollment } from '@/lib/actions/enrollments';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock the action
vi.mock('@/lib/actions/enrollments', () => ({
    createEnrollment: vi.fn(),
}));

// Mock scrollIntoView for Radix Select
Element.prototype.scrollIntoView = vi.fn();

describe('EnrollmentForm Component', () => {
    const mockStudents = [
        { id: 's1', first_name: 'Alice', last_name: 'Doe', grade_level: '6' },
        { id: 's2', first_name: 'Bob', last_name: 'Doe', grade_level: null },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no students are provided', () => {
        render(<EnrollmentForm classId="c1" students={[]} />);
        expect(screen.getByText(/You need to add a child/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add Family Member/i })).toBeInTheDocument();
    });

    it('empty state has correct link to add family page', () => {
        render(<EnrollmentForm classId="c1" students={[]} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/parent/family/add');
    });

    it('renders student selection when students are provided', () => {
        render(<EnrollmentForm classId="c1" students={mockStudents} />);
        expect(screen.getByText(/Select Student/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enroll Now/i })).toBeInTheDocument();
    });

    it('disables enroll button when no student is selected', () => {
        render(<EnrollmentForm classId="c1" students={mockStudents} />);
        const enrollButton = screen.getByRole('button', { name: /Enroll Now/i });
        expect(enrollButton).toBeDisabled();
    });

    it('shows success message and redirects on successful enrollment', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        (createEnrollment as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

        render(<EnrollmentForm classId="c1" students={mockStudents} />);

        // Open the select dropdown
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);

        // Wait for the dropdown to open and select Alice
        await waitFor(() => {
            expect(screen.getByText('Alice Doe (Grade 6)')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice Doe (Grade 6)'));

        // Click enroll button
        const enrollButton = screen.getByRole('button', { name: /Enroll Now/i });
        expect(enrollButton).not.toBeDisabled();

        fireEvent.click(enrollButton);

        // Wait for success message
        await waitFor(() => {
            expect(screen.getByText('Enrollment Successful!')).toBeInTheDocument();
        });

        // Advance timers to trigger redirect
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        expect(mockPush).toHaveBeenCalledWith('/parent/enrollments');
        vi.useRealTimers();
    });

    it('displays error message from server action', async () => {
        (createEnrollment as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Class is full' });

        render(<EnrollmentForm classId="c1" students={mockStudents} />);

        // Open the select dropdown
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);

        // Select a student (Bob has no grade level)
        await waitFor(() => {
            expect(screen.getByText('Bob Doe')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Bob Doe'));

        // Click enroll button
        const enrollButton = screen.getByRole('button', { name: /Enroll Now/i });
        fireEvent.click(enrollButton);

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Class is full')).toBeInTheDocument();
        });
    });

    it('shows loading state while enrolling', async () => {
        // Create a promise that we can control
        let resolveEnrollment: (value: { success: boolean }) => void;
        const enrollmentPromise = new Promise<{ success: boolean }>((resolve) => {
            resolveEnrollment = resolve;
        });
        (createEnrollment as ReturnType<typeof vi.fn>).mockReturnValue(enrollmentPromise);

        render(<EnrollmentForm classId="c1" students={mockStudents} />);

        // Open the select dropdown and select a student
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);

        await waitFor(() => {
            expect(screen.getByText('Alice Doe (Grade 6)')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice Doe (Grade 6)'));

        // Click enroll button
        const enrollButton = screen.getByRole('button', { name: /Enroll Now/i });
        fireEvent.click(enrollButton);

        // Should show loading state
        expect(screen.getByRole('button', { name: /Enrolling.../i })).toBeInTheDocument();

        // Resolve the promise
        await act(async () => {
            resolveEnrollment!({ success: true });
        });
    });

    it('renders student without grade level correctly', async () => {
        render(<EnrollmentForm classId="c1" students={mockStudents} />);

        // Open the select dropdown
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);

        // Bob has no grade level, should just show name without "(Grade X)"
        await waitFor(() => {
            expect(screen.getByText('Bob Doe')).toBeInTheDocument();
        });
    });

    it('displays terms agreement text', () => {
        render(<EnrollmentForm classId="c1" students={mockStudents} />);
        expect(screen.getByText(/By enrolling, you agree to pay/i)).toBeInTheDocument();
    });

    it('displays placeholder text in combobox', () => {
        render(<EnrollmentForm classId="c1" students={mockStudents} />);
        expect(screen.getByText('Choose a child to enroll')).toBeInTheDocument();
    });
});
