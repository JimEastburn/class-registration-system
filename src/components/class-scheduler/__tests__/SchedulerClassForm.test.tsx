
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SchedulerClassForm } from '../SchedulerClassForm';

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

vi.mock('@/lib/actions/scheduler', () => ({
    schedulerCreateClass: vi.fn().mockResolvedValue({ success: true }),
    schedulerUpdateClass: vi.fn().mockResolvedValue({ success: true }),
}));

describe('SchedulerClassForm', () => {

    it('renders the correct day options', async () => {
        const user = userEvent.setup();
        render(<SchedulerClassForm />);

        // Open the Day Select
        // Note: shadcn select often uses role 'combobox' without accessible name if label is separate
        // But we have <FormLabel>Day</FormLabel> so it might work by label text
        // Alternatively find by trigger text placeholder "Day"
        
        const dayTrigger = screen.getByRole('combobox', { name: /day/i }); 
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
