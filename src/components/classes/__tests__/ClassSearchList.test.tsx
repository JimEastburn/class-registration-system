import { describe, it, expect } from 'vitest';
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
    ] as ClassWithTeacher[];

    it('renders all initial classes', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
        expect(screen.getByText('by John Smith')).toBeInTheDocument();
        expect(screen.getByText('by Jane Doe')).toBeInTheDocument();
    });

    it('filters classes based on class name search term', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search by class or teacher name/i);

        // Search for "Math"
        fireEvent.change(searchInput, { target: { value: 'Math' } });

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.queryByText('Advanced Science')).not.toBeInTheDocument();

        // Search for "Science"
        fireEvent.change(searchInput, { target: { value: 'Science' } });

        expect(screen.queryByText('Beginner Math')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    });

    it('filters classes based on teacher name search term', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search by class or teacher name/i);

        // Search for teacher first name "John"
        fireEvent.change(searchInput, { target: { value: 'John' } });

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.queryByText('Advanced Science')).not.toBeInTheDocument();

        // Search for teacher last name "Doe"
        fireEvent.change(searchInput, { target: { value: 'Doe' } });

        expect(screen.queryByText('Beginner Math')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();

        // Search for full teacher name "Jane Doe"
        fireEvent.change(searchInput, { target: { value: 'Jane Doe' } });

        expect(screen.queryByText('Beginner Math')).not.toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    });

    it('shows "No Match Found" when no classes match', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search by class or teacher name/i);

        fireEvent.change(searchInput, { target: { value: 'Nonexistent Class' } });

        expect(screen.getByText('No Match Found')).toBeInTheDocument();
        expect(screen.getByText(/We couldn't find any classes matching "Nonexistent Class"/i)).toBeInTheDocument();

        // Reset search button should work
        const clearButton = screen.getByRole('button', { name: /Clear search/i });
        fireEvent.click(clearButton);

        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
        expect(screen.getByText('Advanced Science')).toBeInTheDocument();
    });

    it('is case insensitive for class and teacher names', () => {
        render(<ClassSearchList initialClasses={mockClasses} />);

        const searchInput = screen.getByPlaceholderText(/Search by class or teacher name/i);

        // Case insensitive class name search
        fireEvent.change(searchInput, { target: { value: 'math' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'MATH' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();

        // Case insensitive teacher name search
        fireEvent.change(searchInput, { target: { value: 'john' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'SMITH' } });
        expect(screen.getByText('Beginner Math')).toBeInTheDocument();
    });
});
