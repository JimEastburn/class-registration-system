import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassStatusLegend from '../ClassStatusLegend';

describe('ClassStatusLegend', () => {
    it('renders the collapsed state initially', () => {
        render(<ClassStatusLegend />);

        expect(screen.getByText('Understanding Class Statuses & Actions')).toBeInTheDocument();
        // The descriptions should not be visible initially
        expect(screen.queryByText(/New class being prepared/i)).not.toBeInTheDocument();
    });

    it('expands when clicked and shows all statuses', () => {
        render(<ClassStatusLegend />);

        const trigger = screen.getByText('Understanding Class Statuses & Actions');
        fireEvent.click(trigger);

        // Check for status titles
        expect(screen.getByText('Draft')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('Cancelled')).toBeInTheDocument();

        // Check for descriptions
        expect(screen.getByText(/New class being prepared/i)).toBeInTheDocument();
        expect(screen.getByText(/Class is live and visible/i)).toBeInTheDocument();
        expect(screen.getByText(/Class has finished/i)).toBeInTheDocument();
        expect(screen.getByText(/Class is discontinued/i)).toBeInTheDocument();
    });

    it('shows the transitions for each status when expanded', () => {
        render(<ClassStatusLegend />);

        const trigger = screen.getByText('Understanding Class Statuses & Actions');
        fireEvent.click(trigger);

        // 4 status labels + 1 in the alert note
        expect(screen.getAllByText(/Transitions/i)).toHaveLength(5);
        expect(screen.getByText(/Manual change to Active to open enrollment/i)).toBeInTheDocument();
    });

    it('shows the deletion warning note', () => {
        render(<ClassStatusLegend />);

        const trigger = screen.getByText('Understanding Class Statuses & Actions');
        fireEvent.click(trigger);

        expect(screen.getByText(/Note on Transitions:/i)).toBeInTheDocument();
        expect(screen.getByText(/Deletions are permanent/i)).toBeInTheDocument();
    });
});
