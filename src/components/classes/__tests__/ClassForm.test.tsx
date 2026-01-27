import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClassForm from '../ClassForm';
import { updateClass } from '@/lib/actions/classes';

// Mock Next.js router
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        back: mockBack,
    }),
}));

// Mock the actions
vi.mock('@/lib/actions/classes', () => ({
    createClass: vi.fn(),
    updateClass: vi.fn(),
}));

// Mock scrollIntoView for Radix Select
Element.prototype.scrollIntoView = vi.fn();
// Mock PointerEvent which Radix often needs
window.PointerEvent = class PointerEvent extends MouseEvent {} as any;
// Mock hasPointerCapture which Radix might use
HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

describe('ClassForm Component', () => {
    const mockTeachers = [
        { id: 't1', full_name: 'Anita Lesch' },
        { id: 't2', full_name: 'Kaden Deckow' },
    ];

    const mockClassData = {
        id: 'c1',
        name: 'Algebra 101',
        description: 'Intro to Algebra',
        location: 'Room 101',
        start_date: '2023-09-01',
        end_date: '2023-12-15',
        schedule: 'Wed 10:00 AM', // Updated to match valid recurrence
        max_students: 20,
        fee: 100,
        syllabus: null,
        teacher_id: 't1', // Initially Anita
        recurrence_pattern: 'weekly',
        recurrence_days: ['wednesday'], // Valid: 'wednesday' or ['tuesday', 'thursday']
        recurrence_time: '10:00',
        recurrence_duration: 60,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('updates teacher selection visually when user changes it', async () => {
        render(
            <ClassForm
                classData={mockClassData}
                teachers={mockTeachers}
                userRole="admin"
            />
        );

        // Find the combobox that shows the current teacher
        const triggers = screen.getAllByRole('combobox');
        const teacherTrigger = triggers.find(t => t.textContent?.includes('Anita Lesch'));
        expect(teacherTrigger).toBeInTheDocument();

        // Click it
        fireEvent.click(teacherTrigger!);

        // Wait for options to appear
        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Kaden Deckow' })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('option', { name: 'Kaden Deckow' }));

        // Verify the trigger now shows "Kaden Deckow"
        await waitFor(() => {
            // Need to re-query the trigger as it might have rerendered or text changed
            const updatedTriggers = screen.getAllByRole('combobox');
            const updatedTrigger = updatedTriggers.find(t => t.textContent?.includes('Kaden Deckow'));
            expect(updatedTrigger).toBeInTheDocument();
        });
    });

    it('calls updateClass with new teacher ID on submit', async () => {
        (updateClass as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: {} });

        render(
            <ClassForm
                classData={mockClassData}
                teachers={mockTeachers}
                userRole="admin"
            />
        );

        // Find and click trigger
        const triggers = screen.getAllByRole('combobox');
        const teacherTrigger = triggers.find(t => t.textContent?.includes('Anita Lesch'));
        expect(teacherTrigger).toBeInTheDocument();
        fireEvent.click(teacherTrigger!);

        // Select Kaden
        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Kaden Deckow' })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('option', { name: 'Kaden Deckow' }));

        // Submit form
        const submitBtn = screen.getByRole('button', { name: /Update Class/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(updateClass).toHaveBeenCalled();
        });

        // Check the arguments passed to updateClass
        const [id, formData] = (updateClass as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(id).toBe('c1');
        expect(formData.get('teacherId')).toBe('t2');
    });

    it('displays error message below buttons when teacher conflict occurs', async () => {
        const errorMsg = 'Teacher already has a class scheduled at this time: Mon 10:00 AM';
        (updateClass as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: errorMsg });

        render(
            <ClassForm
                classData={mockClassData}
                teachers={mockTeachers}
                userRole="admin"
            />
        );

        // Submit form
        const submitBtn = screen.getByRole('button', { name: /Update Class/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            // Should verify that the error message is displayed
            // Since it's displayed twice (top and bottom), getAllByText should return 2 elements
            const errorMessages = screen.getAllByText(errorMsg);
            expect(errorMessages).toHaveLength(2);
        });
    });

    describe('Teacher View', () => {
        it('hides location, start date, and end date fields', () => {
            render(
                <ClassForm
                    teachers={mockTeachers}
                    userRole="teacher"
                />
            );

            expect(screen.queryByLabelText(/Location/i)).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/Start Date/i)).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/End Date/i)).not.toBeInTheDocument();
        });

        it('shows read-only schedule for teachers', () => {
             render(
                <ClassForm
                    classData={mockClassData}
                    teachers={mockTeachers}
                    userRole="teacher"
                />
            );
            
            expect(screen.getByText('Schedule will be assigned by an administrator.')).toBeInTheDocument();
            expect(screen.queryByLabelText(/Schedule \(Manual Entry\)/i)).not.toBeInTheDocument();
        });
    });
});
