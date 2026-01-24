import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import RegisterForm from '../RegisterForm';

// Mock the server action
vi.mock('@/lib/actions/auth', () => ({
    signUp: vi.fn(),
}));

vi.mock('@/components/providers/GlobalLoadingProvider', () => ({
    useGlobalLoading: () => ({
        startLoading: vi.fn(),
        stopLoading: vi.fn(),
        isLoading: false,
    }),
}));

// Fix for Radix UI Select in jsdom
beforeAll(() => {
    // @ts-ignore
    global.Element.prototype.hasPointerCapture = () => false;
    // @ts-ignore
    global.Element.prototype.setPointerCapture = () => { };
    // @ts-ignore
    global.HTMLElement.prototype.scrollIntoView = () => { };
});

describe('RegisterForm', () => {
    it('removes role validation error immediately after selection', async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        // 1. Trigger validation by submitting empty form
        const submitButton = screen.getByRole('button', { name: /create account/i });
        await user.click(submitButton);

        // 2. Verify error appears
        expect(await screen.findByText('Please select Parent/Guardian or Student or Teacher')).toBeInTheDocument();

        // 3. Select a role
        const roleTrigger = screen.getByTestId('role-select-trigger');
        await user.click(roleTrigger);

        // Wait for the option to be visible
        const parentOption = await screen.findByTestId('role-option-parent');
        await user.click(parentOption);

        // 4. Verify error disappears immediately
        await waitFor(() => {
            expect(screen.queryByText('Please select Parent/Guardian or Student or Teacher')).not.toBeInTheDocument();
        });
    });
});
