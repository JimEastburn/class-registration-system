import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SchedulerClassForm } from '../SchedulerClassForm';
import { schedulerCreateClass } from '@/lib/actions/scheduler';

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
  schedulerCreateClass: vi
    .fn()
    .mockResolvedValue({ success: true, data: { classId: 'test-id' } }),
  schedulerUpdateClass: vi.fn().mockResolvedValue({ success: true }),
  getTeachersForScheduler: vi
    .fn()
    .mockResolvedValue({
      success: true,
      data: [{ id: 'teacher-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' }],
    }),
}));

vi.mock('@/lib/actions/materials', () => ({
  upsertSyllabusLink: vi.fn().mockResolvedValue({ success: true }),
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
    const optionValues = options.map((opt) => opt.textContent);

    expect(optionValues).toContain('Tuesday/Thursday');
    expect(optionValues).toContain('Tuesday only');
    expect(optionValues).toContain('Wednesday only');
    expect(optionValues).toContain('Thursday only');

    // Ensure invalid options are NOT present
    expect(optionValues).not.toContain('Monday');
    expect(optionValues).not.toContain('Friday');
  });

  it('renders the correct block options (1-4 only)', async () => {
    const user = userEvent.setup();
    render(<SchedulerClassForm />);

    // Open the Block Select
    const blockTrigger = screen.getByRole('combobox', { name: /block/i });
    await user.click(blockTrigger);

    // Check for options
    const options = await screen.findAllByRole('option');
    const optionValues = options.map((opt) => opt.textContent);

    expect(optionValues).toContain('Block 1');
    expect(optionValues).toContain('Block 2');
    expect(optionValues).toContain('Block 3');
    expect(optionValues).toContain('Block 4');

    // Ensure invalid options are NOT present
    expect(optionValues).not.toContain('Block 5');
    expect(optionValues).not.toContain('Block 6');
  });

  it('renders age range inputs in create mode', () => {
    render(<SchedulerClassForm />);

    const ageMinInput = screen.getByTestId('age-min-input');
    const ageMaxInput = screen.getByTestId('age-max-input');

    expect(ageMinInput).toBeInTheDocument();
    expect(ageMaxInput).toBeInTheDocument();
    // They should be editable (not disabled)
    expect(ageMinInput).not.toBeDisabled();
    expect(ageMaxInput).not.toBeDisabled();
  });

  it('validates age_min must be less than or equal to age_max', async () => {
    const user = userEvent.setup();
    render(<SchedulerClassForm />);

    // Fill required fields
    const nameInput = screen.getByTestId('class-name-input');
    await user.type(nameInput, 'Test Class');

    // Set age_min greater than age_max
    const ageMinInput = screen.getByTestId('age-min-input');
    const ageMaxInput = screen.getByTestId('age-max-input');
    await user.clear(ageMinInput);
    await user.type(ageMinInput, '12');
    await user.clear(ageMaxInput);
    await user.type(ageMaxInput, '8');

    // Submit
    const submitButton = screen.getByTestId('scheduler-submit-button');
    await user.click(submitButton);

    // Expect validation error
    await waitFor(() => {
      expect(screen.getByText(/age min.*cannot.*exceed.*age max/i)).toBeInTheDocument();
    });
  });

  it('includes age values in the create payload', async () => {
    const user = userEvent.setup();
    render(<SchedulerClassForm />);

    // Fill required fields
    const nameInput = screen.getByTestId('class-name-input');
    await user.type(nameInput, 'Art Class');

    // Wait for teacher options to load & select teacher
    const teacherTrigger = screen.getByRole('combobox', { name: /assigned teacher/i });
    await user.click(teacherTrigger);
    const teacherOption = await screen.findByRole('option', { name: /Jane Doe/i });
    await user.click(teacherOption);

    // Select day
    const dayTrigger = screen.getByRole('combobox', { name: /day/i });
    await user.click(dayTrigger);
    const dayOption = await screen.findByRole('option', { name: /tuesday\/thursday/i });
    await user.click(dayOption);

    // Select block
    const blockTrigger = screen.getByRole('combobox', { name: /block/i });
    await user.click(blockTrigger);
    const blockOption = await screen.findByRole('option', { name: /block 1/i });
    await user.click(blockOption);

    // Fill age fields
    const ageMinInput = screen.getByTestId('age-min-input');
    const ageMaxInput = screen.getByTestId('age-max-input');
    await user.clear(ageMinInput);
    await user.type(ageMinInput, '5');
    await user.clear(ageMaxInput);
    await user.type(ageMaxInput, '12');

    // Submit
    const submitButton = screen.getByTestId('scheduler-submit-button');
    await user.click(submitButton);

    await waitFor(() => {
      expect(schedulerCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({
          age_min: 5,
          age_max: 12,
        })
      );
    });
  });
});
