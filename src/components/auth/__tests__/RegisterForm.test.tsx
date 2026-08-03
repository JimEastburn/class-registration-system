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
  global.Element.prototype.setPointerCapture = () => {};
  // @ts-ignore
  // @ts-ignore
  global.HTMLElement.prototype.scrollIntoView = () => {};
  // @ts-ignore
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('RegisterForm', () => {
  it('removes role validation error immediately after selection', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    // 1. Trigger validation by submitting empty form
    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    await user.click(submitButton);

    // 2. Verify error appears
    expect(
      await screen.findByText(
        'Please select Parent/Guardian or Student or Teacher'
      )
    ).toBeInTheDocument();

    // 3. Select a role
    const roleTrigger = screen.getByTestId('role-select-trigger');
    await user.click(roleTrigger);

    // Wait for the option to be visible
    const parentOption = await screen.findByTestId('role-option-parent');
    await user.click(parentOption);

    // 4. Verify error disappears immediately
    expect(
      screen.queryByText('Please select Parent/Guardian or Student or Teacher')
    ).not.toBeInTheDocument();
  });

  it('shows the age field only when Student is selected', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    expect(screen.queryByTestId('age-input')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('role-select-trigger'));
    await user.click(await screen.findByTestId('role-option-student'));
    expect(await screen.findByTestId('age-input')).toBeInTheDocument();

    // Switching away from Student hides it again
    await user.click(screen.getByTestId('role-select-trigger'));
    await user.click(await screen.findByTestId('role-option-parent'));
    expect(screen.queryByTestId('age-input')).not.toBeInTheDocument();
  });

  it('explains why age is needed on hover and on click', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByTestId('role-select-trigger'));
    await user.click(await screen.findByTestId('role-option-student'));

    const infoTrigger = await screen.findByTestId('age-info-trigger');
    expect(screen.queryByTestId('age-info-tooltip')).not.toBeInTheDocument();

    await user.hover(infoTrigger);
    expect(screen.getByText('Why is this necessary?')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Teachers need to know the age of a student to make sure class content is appropriate\./
      )
    ).toBeInTheDocument();

    await user.unhover(infoTrigger);
    await waitFor(() => {
      expect(screen.queryByTestId('age-info-tooltip')).not.toBeInTheDocument();
    });

    // Clicking pins it open (touch devices never fire hover)
    await user.click(infoTrigger);
    await user.unhover(infoTrigger);
    expect(screen.getByTestId('age-info-tooltip')).toBeInTheDocument();
  });

  it('requires an age for students and submits it', async () => {
    const { signUp } = await import('@/lib/actions/auth');
    vi.mocked(signUp).mockResolvedValue({
      success: true,
      data: { userId: 'user-1' },
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByTestId('first-name-input'), 'Sam');
    await user.type(screen.getByTestId('last-name-input'), 'Rivera');
    await user.type(screen.getByTestId('register-email-input'), 'sam@test.com');
    await user.type(screen.getByTestId('register-password-input'), 'Passw0rd!');
    await user.type(screen.getByTestId('confirm-password-input'), 'Passw0rd!');
    await user.click(screen.getByTestId('coc-checkbox'));
    await user.click(screen.getByTestId('fee-acknowledgment-checkbox'));
    await user.click(screen.getByTestId('role-select-trigger'));
    await user.click(await screen.findByTestId('role-option-student'));

    // Everything filled except age
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Age is required')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('age-input'), '14');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalled();
    });
    const submitted = vi.mocked(signUp).mock.calls[0][0] as FormData;
    expect(submitted.get('role')).toBe('student');
    expect(submitted.get('age')).toBe('14');
  });

  it('validates code of conduct requirement', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    await user.click(submitButton);

    expect(
      await screen.findByText('You must agree to the Community Code of Conduct')
    ).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox', { name: /code of conduct/i });
    await user.click(checkbox);

    await waitFor(() => {
      expect(
        screen.queryByText('You must agree to the Community Code of Conduct')
      ).not.toBeInTheDocument();
    });
  });

  it('validates fee acknowledgment requirement', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const submitButton = screen.getByRole('button', {
      name: /create account/i,
    });
    await user.click(submitButton);

    expect(
      await screen.findByText('You must agree to pay a deposit for each class')
    ).toBeInTheDocument();

    const checkbox = screen.getByTestId('fee-acknowledgment-checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(
        screen.queryByText('You must agree to pay a deposit for each class')
      ).not.toBeInTheDocument();
    });
  });
});
