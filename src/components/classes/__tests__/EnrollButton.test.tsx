import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnrollButton } from '../EnrollButton';
import { enrollStudent } from '@/lib/actions/enrollments';
import { getFamilyMembers } from '@/lib/actions/family';
import { toast } from 'sonner';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('@/lib/actions/enrollments', () => ({
    enrollStudent: vi.fn(),
}));

vi.mock('@/lib/actions/family', () => ({
    getFamilyMembers: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(window, 'location', {
    writable: true,
    value: locationMock,
});

describe('EnrollButton', () => {
    const mockClassId = 'class-123';
    const mockEnrollmentId = 'enroll-456';
    const mockMembers = [
        { id: 'member-1', first_name: 'John', last_name: 'Doe' },
        { id: 'member-2', first_name: 'Jane', last_name: 'Doe' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        locationMock.href = '';
        (getFamilyMembers as any).mockResolvedValue({ data: mockMembers, error: null });
    });

    it('renders enroll button and opens dialog with family members', async () => {
        render(
            <EnrollButton
                classId={mockClassId}
                className="Test Class"
                price={100}
                available={5}
            />
        );

        const enrollBtn = screen.getByText('Enroll Now');
        fireEvent.click(enrollBtn);

        expect(screen.getByText('Enroll in Test Class')).toBeInTheDocument();

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByText('Loading family members...')).not.toBeInTheDocument();
        });

        // Trigger Select to see options
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);

        await waitFor(() => {
             expect(screen.getByText('John Doe')).toBeInTheDocument();
             expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        });
    });

    it('handles waitlist flow correctly', async () => {
        (enrollStudent as any).mockResolvedValue({
            data: null,
            status: 'waitlisted',
            error: null,
        });

        render(
            <EnrollButton
                classId={mockClassId}
                className="Test Class"
                price={100}
                available={5}
            />
        );

        fireEvent.click(screen.getByText('Enroll Now'));
        
        await waitFor(() => {
            expect(screen.queryByText('Loading family members...')).not.toBeInTheDocument();
        });

        // Open select
        fireEvent.click(screen.getByRole('combobox'));
        // Select John
        const option = await screen.findByText('John Doe');
        fireEvent.click(option);

        // Submit
        const proceedBtn = await screen.findByText('Proceed to Payment');
        fireEvent.click(proceedBtn);

        await waitFor(() => {
            expect(enrollStudent).toHaveBeenCalledWith({
                classId: mockClassId,
                familyMemberId: 'member-1',
            });
            expect(toast.success).toHaveBeenCalledWith('Successfully joined waitlist');
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    it('handles payment flow (POST to checkout) correctly', async () => {
        (enrollStudent as any).mockResolvedValue({
            data: { id: mockEnrollmentId },
            status: 'pending',
            error: null,
        });

        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ url: 'https://checkout.stripe.com/test' }),
        });

        render(
            <EnrollButton
                classId={mockClassId}
                className="Test Class"
                price={100}
                available={5}
            />
        );

        fireEvent.click(screen.getByText('Enroll Now'));
        
        await waitFor(() => {
            expect(screen.queryByText('Loading family members...')).not.toBeInTheDocument();
        });
        
        // Open select
        fireEvent.click(screen.getByRole('combobox'));
        // Select Jane
        const option = await screen.findByText('Jane Doe');
        fireEvent.click(option);

        // Submit
        const proceedBtn = await screen.findByText('Proceed to Payment');
        fireEvent.click(proceedBtn);

        await waitFor(() => {
            expect(enrollStudent).toHaveBeenCalledWith({
                classId: mockClassId,
                familyMemberId: 'member-2',
            });
        });

        await waitFor(() => {
             expect(fetchMock).toHaveBeenCalledWith('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrollmentId: mockEnrollmentId }),
            });
            expect(locationMock.href).toBe('https://checkout.stripe.com/test');
        });
    });

    it('handles API errors gracefully', async () => {
         (enrollStudent as any).mockResolvedValue({
            data: null,
            status: null,
            error: 'Database error',
        });

        render(
            <EnrollButton
                classId={mockClassId}
                className="Test Class"
                price={100}
                available={5}
            />
        );

        fireEvent.click(screen.getByText('Enroll Now'));
        
        await waitFor(() => {
            expect(screen.queryByText('Loading family members...')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('combobox'));
        const option = await screen.findByText('John Doe');
        fireEvent.click(option);
        
        const proceedBtn = await screen.findByText('Proceed to Payment');
        fireEvent.click(proceedBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Database error');
        });
    });
    it('handles confirmed flow (no payment needed) correctly', async () => {
        (enrollStudent as any).mockResolvedValue({
            data: { id: mockEnrollmentId },
            status: 'confirmed',
            error: null,
        });

        render(
            <EnrollButton
                classId={mockClassId}
                className="Test Class"
                price={100}
                available={5}
            />
        );

        fireEvent.click(screen.getByText('Enroll Now'));
        
        await waitFor(() => {
            expect(screen.queryByText('Loading family members...')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('combobox'));
        const option = await screen.findByText('John Doe');
        fireEvent.click(option);

        const proceedBtn = await screen.findByText('Proceed to Payment');
        fireEvent.click(proceedBtn);

        await waitFor(() => {
            expect(enrollStudent).toHaveBeenCalledWith({
                classId: mockClassId,
                familyMemberId: 'member-1',
            });
            expect(toast.success).toHaveBeenCalledWith('Enrollment confirmed');
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });
});
