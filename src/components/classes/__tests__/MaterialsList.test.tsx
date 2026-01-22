import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MaterialsList from '../MaterialsList';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: vi.fn(),
    }),
}));

// Mock the actions
vi.mock('@/lib/actions/materials', () => ({
    deleteMaterial: vi.fn(),
    updateMaterial: vi.fn(),
}));

describe('MaterialsList Component', () => {
    const mockMaterials = [
        {
            id: 'm1',
            name: 'Course Syllabus',
            description: 'The full course syllabus',
            file_url: 'https://example.com/syllabus.pdf',
            file_type: 'pdf',
            is_public: true,
            created_at: '2024-01-01T00:00:00Z',
        },
        {
            id: 'm2',
            name: 'Internal Draft',
            description: 'Draft notes',
            file_url: 'https://example.com/draft.doc',
            file_type: 'doc',
            is_public: false,
            created_at: '2024-01-02T00:00:00Z',
        },
    ];

    it('renders materials correctly', () => {
        render(<MaterialsList materials={mockMaterials} classId="c1" />);

        expect(screen.getByText('Course Syllabus')).toBeInTheDocument();
        expect(screen.getByText('The full course syllabus')).toBeInTheDocument();
        expect(screen.getByText('Internal Draft')).toBeInTheDocument();
    });

    it('shows correct visibility badges', () => {
        render(<MaterialsList materials={mockMaterials} classId="c1" />);

        expect(screen.getByText('Visible to students')).toBeInTheDocument();
        expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('renders file type icons', () => {
        render(<MaterialsList materials={mockMaterials} classId="c1" />);

        // PDF icon from fileTypeIcons: '📄'
        expect(screen.getByText('📄')).toBeInTheDocument();
        // DOC icon from fileTypeIcons: '📝'
        expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('links to the correct file URL', () => {
        render(<MaterialsList materials={mockMaterials} classId="c1" />);

        const link = screen.getByText('Course Syllabus');
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/syllabus.pdf');
    });
});
