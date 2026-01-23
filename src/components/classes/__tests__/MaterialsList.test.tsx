import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import MaterialsList from '../MaterialsList';
import { deleteMaterial, updateMaterial } from '@/lib/actions/materials';

// Mock Next.js router
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        refresh: mockRefresh,
    }),
}));

// Mock the actions
vi.mock('@/lib/actions/materials', () => ({
    deleteMaterial: vi.fn(),
    updateMaterial: vi.fn(),
}));

// Mock window.confirm and window.alert
const mockConfirm = vi.fn();
const mockAlert = vi.fn();

describe('MaterialsList Component', () => {
    const mockMaterials = [
        {
            id: 'm1',
            name: 'Course Syllabus',
            description: 'The full course syllabus',
            file_url: 'https://example.com/syllabus.pdf',
            file_type: 'pdf',
            is_public: true,
            created_at: '2024-01-15T12:00:00Z',
        },
        {
            id: 'm2',
            name: 'Internal Draft',
            description: 'Draft notes',
            file_url: 'https://example.com/draft.doc',
            file_type: 'doc',
            is_public: false,
            created_at: '2024-01-16T12:00:00Z',
        },
        {
            id: 'm3',
            name: 'Course Video',
            description: null,
            file_url: 'https://example.com/video.mp4',
            file_type: 'video',
            is_public: true,
            created_at: '2024-01-17T12:00:00Z',
        },
        {
            id: 'm4',
            name: 'Image Resource',
            description: 'An image',
            file_url: 'https://example.com/image.png',
            file_type: 'image',
            is_public: true,
            created_at: '2024-01-18T12:00:00Z',
        },
        {
            id: 'm5',
            name: 'External Link',
            description: 'A link resource',
            file_url: 'https://example.com/link',
            file_type: 'link',
            is_public: true,
            created_at: '2024-01-19T12:00:00Z',
        },
        {
            id: 'm6',
            name: 'Other File',
            description: 'Unknown type',
            file_url: 'https://example.com/other.xyz',
            file_type: 'unknown',
            is_public: true,
            created_at: '2024-01-20T12:00:00Z',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = mockConfirm;
        window.alert = mockAlert;
    });

    it('renders materials correctly', () => {
        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        expect(screen.getByText('Course Syllabus')).toBeInTheDocument();
        expect(screen.getByText('The full course syllabus')).toBeInTheDocument();
        expect(screen.getByText('Internal Draft')).toBeInTheDocument();
    });

    it('shows correct visibility badges', () => {
        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        expect(screen.getByText('Visible to students')).toBeInTheDocument();
        expect(screen.getByText('Hidden')).toBeInTheDocument();
    });

    it('renders all file type icons correctly', () => {
        render(<MaterialsList materials={mockMaterials} classId="c1" />);

        // PDF: 📄
        expect(screen.getByText('📄')).toBeInTheDocument();
        // DOC: 📝
        expect(screen.getByText('📝')).toBeInTheDocument();
        // Video: 🎬
        expect(screen.getByText('🎬')).toBeInTheDocument();
        // Image: 🖼️
        expect(screen.getByText('🖼️')).toBeInTheDocument();
        // Link: 🔗
        expect(screen.getByText('🔗')).toBeInTheDocument();
        // Unknown/other: 📎 (fallback)
        expect(screen.getByText('📎')).toBeInTheDocument();
    });

    it('links to the correct file URL with proper attributes', () => {
        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        const link = screen.getByText('Course Syllabus');
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/syllabus.pdf');
        expect(link.closest('a')).toHaveAttribute('target', '_blank');
        expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('handles delete when user confirms', async () => {
        mockConfirm.mockReturnValue(true);
        (deleteMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        fireEvent.click(deleteButtons[0]);

        expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this material?');
        expect(deleteMaterial).toHaveBeenCalledWith('m1');
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it('does not delete when user cancels confirmation', async () => {
        mockConfirm.mockReturnValue(false);

        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        fireEvent.click(deleteButtons[0]);

        expect(mockConfirm).toHaveBeenCalled();
        expect(deleteMaterial).not.toHaveBeenCalled();
    });

    it('shows alert when delete fails', async () => {
        mockConfirm.mockReturnValue(true);
        (deleteMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Delete failed' });

        render(<MaterialsList materials={mockMaterials.slice(0, 2)} classId="c1" />);

        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        fireEvent.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Delete failed');
        });
    });

    it('toggles visibility from public to hidden', async () => {
        (updateMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

        render(<MaterialsList materials={mockMaterials.slice(0, 1)} classId="c1" />);

        // First material is public, so button should say "Hide"
        const hideButton = screen.getByRole('button', { name: /Hide/i });
        fireEvent.click(hideButton);

        expect(updateMaterial).toHaveBeenCalledWith('m1', { isPublic: false });
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it('toggles visibility from hidden to public', async () => {
        (updateMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

        const hiddenMaterial = [{ ...mockMaterials[1] }]; // is_public: false
        render(<MaterialsList materials={hiddenMaterial} classId="c1" />);

        // Material is hidden, so button should say "Show"
        const showButton = screen.getByRole('button', { name: /Show/i });
        fireEvent.click(showButton);

        expect(updateMaterial).toHaveBeenCalledWith('m2', { isPublic: true });
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
        });
    });

    it('shows alert when toggle visibility fails', async () => {
        (updateMaterial as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Update failed' });

        render(<MaterialsList materials={mockMaterials.slice(0, 1)} classId="c1" />);

        const hideButton = screen.getByRole('button', { name: /Hide/i });
        fireEvent.click(hideButton);

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Update failed');
        });
    });

    it('disables buttons while loading', async () => {
        // Create a promise that we can control
        let resolveDelete: (value: { success: boolean }) => void;
        const deletePromise = new Promise<{ success: boolean }>((resolve) => {
            resolveDelete = resolve;
        });
        mockConfirm.mockReturnValue(true);
        (deleteMaterial as ReturnType<typeof vi.fn>).mockReturnValue(deletePromise);

        render(<MaterialsList materials={mockMaterials.slice(0, 1)} classId="c1" />);

        const deleteButton = screen.getByRole('button', { name: /Delete/i });
        const hideButton = screen.getByRole('button', { name: /Hide/i });

        fireEvent.click(deleteButton);

        // Both buttons should be disabled while loading
        expect(deleteButton).toBeDisabled();
        expect(hideButton).toBeDisabled();

        // Resolve the promise
        await act(async () => {
            resolveDelete!({ success: true });
        });

        await waitFor(() => {
            expect(deleteButton).not.toBeDisabled();
        });
    });

    it('renders material without description', () => {
        const materialNoDesc = [mockMaterials[2]]; // description: null
        render(<MaterialsList materials={materialNoDesc} classId="c1" />);

        expect(screen.getByText('Course Video')).toBeInTheDocument();
        // No description paragraph should be rendered
        expect(screen.queryByText('null')).not.toBeInTheDocument();
    });

    it('displays formatted dates', () => {
        render(<MaterialsList materials={mockMaterials.slice(0, 1)} classId="c1" />);

        // The date should be formatted - just check the element exists with date content
        const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(dateElements.length).toBeGreaterThan(0);
    });

    it('renders empty list when no materials provided', () => {
        const { container } = render(<MaterialsList materials={[]} classId="c1" />);

        // Should render an empty container with no material items
        expect(container.querySelector('.space-y-3')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    });
});
