import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LoginForm from '../LoginForm';

// Mock the server action
vi.mock('@/lib/actions/auth', () => ({
    signIn: vi.fn(),
}));

describe('LoginForm', () => {
    it('does not have a placeholder for the password field', () => {
        render(<LoginForm />);
        const passwordInput = screen.getByTestId('password-input');
        expect(passwordInput).not.toHaveAttribute('placeholder');
    });
});
