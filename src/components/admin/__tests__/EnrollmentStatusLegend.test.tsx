import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnrollmentStatusLegend from '../EnrollmentStatusLegend';

describe('EnrollmentStatusLegend', () => {
    it('renders the collapsed state initially', () => {
        render(<EnrollmentStatusLegend />);

        expect(screen.getByText('Understanding Enrollment Statuses & Actions')).toBeInTheDocument();
        // The descriptions should not be visible initially
        expect(screen.queryByText(/initiated but not yet finalized/i)).not.toBeInTheDocument();
    });

    it('expands when clicked and shows all statuses', () => {
        render(<EnrollmentStatusLegend />);

        const trigger = screen.getByText('Understanding Enrollment Statuses & Actions');
        fireEvent.click(trigger);

        // Check for status titles
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();

        // Check for descriptions
        expect(screen.getByText(/initiated but not yet finalized/i)).toBeInTheDocument();
        expect(screen.getByText(/successfully enrolled and occupies a seat/i)).toBeInTheDocument();
        expect(screen.getByText(/class has concluded/i)).toBeInTheDocument();
        expect(screen.getByText(/enrollment is voided/i)).toBeInTheDocument();
    });

    it('shows the transitions for each status when expanded', () => {
        render(<EnrollmentStatusLegend />);

        const trigger = screen.getByText('Understanding Enrollment Statuses & Actions');
        fireEvent.click(trigger);

        // 4 status labels + 1 in the alert note
        expect(screen.getAllByText(/Transitions/i)).toHaveLength(5);
        expect(screen.getByText(/Automatically moves to Confirmed on payment success/i)).toBeInTheDocument();
    });

    it('shows the capacity warning note', () => {
        render(<EnrollmentStatusLegend />);

        const trigger = screen.getByText('Understanding Enrollment Statuses & Actions');
        fireEvent.click(trigger);

        expect(screen.getByText(/Note on Transitions:/i)).toBeInTheDocument();
        expect(screen.getByText(/immediately update class capacity totals/i)).toBeInTheDocument();
    });
});
