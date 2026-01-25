import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentList from '../StudentList';

// Mock components that might cause issues
vi.mock('@/components/classes/StudentActionMenu', () => ({
    StudentActionMenu: () => <button>Actions</button>,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className }: any) => <div className={className}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('StudentList Component', () => {
    const mockEnrollments = [
        {
            id: 'e1',
            status: 'confirmed',
            enrolled_at: '2024-01-01T12:00:00Z',
            class_id: 'c1',
            student_id: 's1',
            student: {
                id: 's1',
                first_name: 'John',
                last_name: 'Doe',
                grade_level: '5',
                parent: {
                    email: 'jane.doe@example.com',
                    phone: '555-1234',
                    family_members: [
                        { id: 's1', first_name: 'John', last_name: 'Doe', role: 'student' },
                        { id: 's2', first_name: 'Jane', last_name: 'Doe', role: 'parent' },
                        { id: 's3', first_name: 'Jimmy', last_name: 'Doe', role: 'student' },
                    ],
                },
            },
        },
    ];

    const mockBlockedSet = new Set<string>();
    const mockClassNameMap = { c1: 'Math 101' };

    it('renders the student list correctly', () => {
        render(
            <StudentList
                enrollments={mockEnrollments}
                blockedSet={mockBlockedSet}
                classNameMap={mockClassNameMap}
            />
        );

        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Math 101')).toBeInTheDocument();
        expect(screen.getByText('confirmed')).toBeInTheDocument();
    });

    it('expands the row on click and shows family details', () => {
        render(
            <StudentList
                enrollments={mockEnrollments}
                blockedSet={mockBlockedSet}
                classNameMap={mockClassNameMap}
            />
        );

        // Initially expanded content should not be visible (or just not in the document)
        expect(screen.queryByText('Parent Contact')).not.toBeInTheDocument();

        // Click the row
        fireEvent.click(screen.getByText('John Doe'));

        // Now it should be visible
        expect(screen.getByText('Parent Contact')).toBeInTheDocument();
        expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();

        // Should show sibling Jimmy but not self (John) or Jane (who is the parent but also in family_members list, logic filters by id !== student.id)
        // Wait, my logic was: m.id !== student.id.
        // In mock: s1 is student via id check. s2 is parent. s3 is sibling.
        // So s2 and s3 should show up in "Family Members" list.
        expect(screen.getByText((content) => content.includes('Jimmy Doe'))).toBeInTheDocument();
        expect(screen.getByText((content) => content.includes('Jane Doe'))).toBeInTheDocument();
    });

    it('toggles expansion off on second click', () => {
        render(
            <StudentList
                enrollments={mockEnrollments}
                blockedSet={mockBlockedSet}
                classNameMap={mockClassNameMap}
            />
        );

        // Expand
        fireEvent.click(screen.getByText('John Doe'));
        expect(screen.getByText('Parent Contact')).toBeInTheDocument();

        // Collapse
        fireEvent.click(screen.getByText('John Doe'));
        // With AnimatePresence mocked, it might remain for a bit if we simulated exit, but here simply checking if it's gone from DOM
        // Since we mocked AnimatePresence to just render children, conditional rendering in component `isExpanded && ...` controls it.
        expect(screen.queryByText('Parent Contact')).not.toBeInTheDocument();
    });

    it('renders empty state when no enrollments', () => {
        render(
            <StudentList
                enrollments={[]}
                blockedSet={mockBlockedSet}
                classNameMap={mockClassNameMap}
            />
        );

        expect(screen.getByText(/No students enrolled/i)).toBeInTheDocument();
    });
});
