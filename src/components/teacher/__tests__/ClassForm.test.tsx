
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
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

    it('renders the correct day options for teachers', async () => {
        const user = userEvent.setup();
        render(<ClassForm mode="create" />);

        // Open the Day Select
        const dayTrigger = screen.getByRole('combobox', { name: /day of week/i });
        await user.click(dayTrigger);

        // Check for options
        const options = await screen.findAllByRole('option');
        const optionValues = options.map(opt => opt.textContent);

        expect(optionValues).toContain('Tuesday/Thursday');
        expect(optionValues).toContain('Tuesday');
        expect(optionValues).toContain('Wednesday');
        expect(optionValues).toContain('Thursday');
        
        // Ensure invalid options are NOT present
        expect(optionValues).not.toContain('Monday');
        expect(optionValues).not.toContain('Friday');
    });
});
