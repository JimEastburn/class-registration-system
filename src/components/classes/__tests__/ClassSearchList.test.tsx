import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassSearchList from '../ClassSearchList';
import { ClassWithTeacher } from '@/types';

// Mock Lucide icons or any SVG if needed, but the SVGs are inline so no need.

describe('ClassSearchList Component', () => {
    const mockClasses: ClassWithTeacher[] = [
        {
            id: 'c1',
            name: 'Beginner Math',
            description: 'Intro to numbers',
            teacher_id: 't1',
            status: 'active',
            schedule: 'Mon/Wed 3pm',
            location: 'Room 101',
            start_date: '2026-02-01',
            end_date: '2026-05-01',
            fee: 100,
            max_students: 10,
            current_enrollment: 5,
            created_at: '',
            updated_at: '',
            teacher: {
                id: 't1',
                first_name: 'John',
                last_name: 'Smith',
                role: 'teacher',
                email: 'john@example.com',
                created_at: '',
                updated_at: ''
            }
        },
        {
            id: 'c2',
            name: 'Advanced Science',
            description: 'Physics and Chemistry',
            teacher_id: 't2',
            status: 'active',
            schedule: 'Tue/Thu 4pm',
            location: 'Lab 1',
            start_date: '2026-02-01',
            end_date: '2026-05-01',
            fee: 150,
            max_students: 15,
            current_enrollment: 12,
            created_at: '',
            updated_at: '',
            teacher: {
                id: 't2',
                first_name: 'Jane',
                last_name: 'Doe',
                role: 'teacher',
                email: 'jane@example.com',
                created_at: '',
                updated_at: ''
            }
        },
    ] as any;

    it('renders all initial classes', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
        expect(screen.getByText('by John Smith')).toBeInTheDocument();
        expect(screen.getByText('by Jane Doe')).toBeInTheDocument();
    });

    it('filters classes based on search term', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search classes by name/i);

        // Search for "Math"
        fireEvent.change(searchInput, { target: { value: 'Math' } });

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.queryByText('Advanced Science')).not.toBeInTheDocument();

        // Search for "Science"
        fireEvent.change(searchInput, { target: { value: 'Science' } });

        expect(screen.queryByText('Beginner Math')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    });

    it('shows "No Match Found" when no classes match', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search classes by name/i);

        fireEvent.change(searchInput, { target: { value: 'Nonexistent Class' } });

        expect(screen.getByText('No Match Found')).toBeInTheDocument();
        expect(screen.getByText(/We couldn't find any classes matching "Nonexistent Class"/i)).toBeInTheDocument();

        // Reset search button should work
        const clearButton = screen.getByRole('button', { name: /Clear search/i });
        fireEvent.click(clearButton);

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    });

    it('is case insensitive', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search classes by name/i);

        fireEvent.change(searchInput, { target: { value: 'math' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'MATH' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
    });
});
