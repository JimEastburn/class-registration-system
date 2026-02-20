
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ClassForm } from '../ClassForm';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }));

vi.mock('@/lib/actions/classes', () => ({
    createClass: vi.fn().mockResolvedValue({ success: true, data: { classId: '123' } }),
    updateClass: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Teacher ClassForm', () => {

    it('renders the create form with required fields and data-testid attributes', () => {
        render(<ClassForm mode="create" />);

        // Verify required fields are present via data-testid
        expect(screen.getByTestId('class-form')).toBeInTheDocument();
        expect(screen.getByTestId('class-name-input')).toBeInTheDocument();
        expect(screen.getByTestId('class-description-input')).toBeInTheDocument();
        expect(screen.getByTestId('class-capacity-input')).toBeInTheDocument();
        expect(screen.getByTestId('class-submit-button')).toBeInTheDocument();

        // Submit button should say "Create Class" in create mode
        expect(screen.getByTestId('class-submit-button')).toHaveTextContent('Create Class');
    });

    it('renders "Save Changes" button in edit mode', () => {
        render(<ClassForm mode="edit" existingClass={{
            id: '123',
            name: 'Test Class',
            description: 'A test',
            capacity: 10,
            teacher_id: 'teacher-1',
            status: 'draft',
            price: 30,
            location: null,
            day_of_week: null,
            time_block: null,
            age_min: null,
            age_max: null,
            schedule_config: null,
            current_enrollment: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }} />);

        expect(screen.getByTestId('class-submit-button')).toHaveTextContent('Save Changes');
        expect(screen.getByTestId('class-name-input')).toHaveValue('Test Class');
    });
});
