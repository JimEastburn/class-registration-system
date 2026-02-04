
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AdminClassForm } from '../AdminClassForm';

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
    createClass: vi.fn().mockResolvedValue({ success: true }),
    updateClass: vi.fn().mockResolvedValue({ success: true }),
}));

describe('AdminClassForm', () => {
    const mockTeachers = [
        { id: 't1', first_name: 'John', last_name: 'Doe' },
        { id: 't2', first_name: 'Jane', last_name: 'Smith' }, 
    ];

    it('renders the correct day options', async () => {
        const user = userEvent.setup();
        render(<AdminClassForm teachers={mockTeachers} />);

        // Open the Day Select
        const dayTrigger = screen.getByRole('combobox', { name: /day/i });
        await user.click(dayTrigger);

        // Check for options
        const options = await screen.findAllByRole('option');
        const optionValues = options.map(opt => opt.textContent);

        expect(optionValues).toContain('Tuesday/Thursday');
        expect(optionValues).toContain('Tuesday only');
        expect(optionValues).toContain('Wednesday only');
        expect(optionValues).toContain('Thursday only');
        
        // Ensure invalid options are NOT present
        expect(optionValues).not.toContain('Monday');
        expect(optionValues).not.toContain('Friday');
        expect(optionValues).not.toContain('Saturday');
        expect(optionValues).not.toContain('Sunday');
    });

    it('verifies that Monday and Friday are strictly absent from the list', async () => {
         const user = userEvent.setup();
         render(<AdminClassForm teachers={mockTeachers} />);
 
         // Open the Select
         const dayTrigger = screen.getByRole('combobox', { name: /day/i });
         await user.click(dayTrigger);
         
         // Using queryAllByRole to check existence without waiting
         const mondayOption = screen.queryByRole('option', { name: /Monday/i });
         const fridayOption = screen.queryByRole('option', { name: /Friday/i });
 
         expect(mondayOption).toBeNull();
         expect(fridayOption).toBeNull();
    });

    it('renders the correct block options (1-5 only)', async () => {
        const user = userEvent.setup();
        render(<AdminClassForm teachers={mockTeachers} />);

        // Open the Block Select
        const blockTrigger = screen.getByRole('combobox', { name: /block/i });
        await user.click(blockTrigger);

        // Check for options
        const options = await screen.findAllByRole('option');
        const optionValues = options.map(opt => opt.textContent);

        expect(optionValues).toContain('Block 1');
        expect(optionValues).toContain('Block 2');
        expect(optionValues).toContain('Block 3');
        expect(optionValues).toContain('Block 4');
        expect(optionValues).toContain('Block 5');
        
        // Ensure invalid options are NOT present
        expect(optionValues).not.toContain('Block 6');
    });
});
