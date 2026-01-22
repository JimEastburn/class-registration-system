import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StudentScheduleView, { parseScheduleDays } from '../StudentScheduleView';

describe('StudentScheduleView Component', () => {
    const mockEnrollments = [
        {
            id: 'e1',
            status: 'confirmed',
            class: {
                id: 'c1',
                name: 'Math 101',
                schedule: 'Mon, Wed 3:00 PM',
                location: 'Room 1',
                start_date: '2024-01-01',
                end_date: '2024-05-01',
                teacher: { first_name: 'John', last_name: 'Smith' },
            },
        },
    ];

    it('renders empty state when no enrollments provided', () => {
        render(<StudentScheduleView enrollments={[]} />);
        expect(screen.getByText(/No Classes Yet/i)).toBeInTheDocument();
    });

    it('renders classes in the correct day columns', () => {
        render(<StudentScheduleView enrollments={mockEnrollments} />);

        // Find the 'Mon' card using its title and then finding the parent card
        const monTitle = screen.getByText('Mon');
        const monCard = monTitle.closest('[data-slot="card"]');
        expect(monCard).toHaveTextContent('Math 101');

        // Find the 'Wed' card
        const wedTitle = screen.getByText('Wed');
        const wedCard = wedTitle.closest('[data-slot="card"]');
        expect(wedCard).toHaveTextContent('Math 101');

        // Find the 'Tue' card - should be empty
        const tueTitle = screen.getByText('Tue');
        const tueCard = tueTitle.closest('[data-slot="card"]');
        expect(tueCard).toHaveTextContent('No classes');
    });

    it('renders the list view correctly', () => {
        render(<StudentScheduleView enrollments={mockEnrollments} />);

        expect(screen.getByText('All Classes')).toBeInTheDocument();
        // Use getAllByText because it appears in columns (Mon, Wed) AND in the list
        expect(screen.getAllByText('Math 101')).toHaveLength(3);
        expect(screen.getByText(/Mon, Wed 3:00 PM/i)).toBeInTheDocument();
        expect(screen.getAllByText(/John Smith/i)).toHaveLength(3);
    });
});

describe('parseScheduleDays helper', () => {
    it('identifies days from schedule string', () => {
        expect(parseScheduleDays('Mon, Wed, Fri')).toEqual(['Mon', 'Wed', 'Fri']);
        expect(parseScheduleDays('Tuesday and Thursday')).toEqual(['Tue', 'Thu']);
    });

    it('returns TBD for unknown schedules', () => {
        expect(parseScheduleDays('Unknown time')).toEqual(['TBD']);
    });
});
