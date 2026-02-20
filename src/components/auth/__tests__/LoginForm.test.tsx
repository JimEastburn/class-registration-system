import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LoginForm from '../LoginForm';

// Mock the server action
vi.mock('@/lib/actions/auth', () => ({
    signIn: vi.fn(),
}));

vi.mock('@/lib/actions/google-auth', () => ({
    signInWithGoogle: vi.fn(),
}));

vi.mock('@/components/providers/GlobalLoadingProvider', () => ({
    useGlobalLoading: () => ({
        startLoading: vi.fn(),
        stopLoading: vi.fn(),
        isLoading: false,
    }),
}));

describe('LoginForm', () => {
    it('does not have a placeholder for the password field', () => {
        render(<LoginForm />);
        const passwordInput = screen.getByTestId('password-input');
        expect(passwordInput).not.toHaveAttribute('placeholder');
    });

    it('does not display error when redirecting', async () => {
        const { signIn } = await import('@/lib/actions/auth');
        // Mock signIn to simulate a redirect error
        (signIn as any).mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

        render(<LoginForm />);

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByTestId('login-submit-button'));

        // Expect no error message to appear
        await waitFor(() => {
            expect(screen.queryByText(/unexpected error/i)).not.toBeInTheDocument();
        });
    });

    it('renders the Google sign-in button', () => {
        render(<LoginForm />);
        const googleButton = screen.getByTestId('google-signin-button');
        expect(googleButton).toBeInTheDocument();
        expect(googleButton).toHaveTextContent(/sign in with google/i);
    });

    it('renders the "or continue with email" divider', () => {
        render(<LoginForm />);
        expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    });
});
