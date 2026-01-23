import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentStatusLegend from '../PaymentStatusLegend';

describe('PaymentStatusLegend', () => {
    it('renders the collapsed state initially', () => {
        render(<PaymentStatusLegend />);

        expect(screen.getByText('Understanding Payment Statuses')).toBeInTheDocument();
        // The descriptions should not be visible initially
        expect(screen.queryByText(/Payment has been successfully processed/i)).not.toBeInTheDocument();
    });

    it('expands when clicked and shows all statuses', () => {
        render(<PaymentStatusLegend />);

        const trigger = screen.getByText('Understanding Payment Statuses');
        fireEvent.click(trigger);

        // Check for status titles
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Refunded')).toBeInTheDocument();

        // Check for descriptions
        expect(screen.getByText(/Payment has been successfully processed/i)).toBeInTheDocument();
        expect(screen.getByText(/Payment is initiated but not yet confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/Payment was declined or failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Payment has been returned to the user/i)).toBeInTheDocument();
    });
});
