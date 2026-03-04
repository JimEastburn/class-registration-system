import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AdminClassForm } from '../AdminClassForm';

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

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
    const optionValues = options.map((opt) => opt.textContent);

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

  it('renders the correct block options (1-4 only)', async () => {
    const user = userEvent.setup();
    render(<AdminClassForm teachers={mockTeachers} />);

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

  it('renders Age Min and Age Max inputs', () => {
    render(<AdminClassForm teachers={mockTeachers} />);
    expect(screen.getByLabelText(/age min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/age max/i)).toBeInTheDocument();
  });

  it('populates age fields from initialData in edit mode', () => {
    const classData = {
      id: 'class-1',
      name: 'Art 101',
      description: '',
      capacity: 20,
      price: 30,
      status: 'draft' as const,
      teacher_id: 't1',
      day: 'Tuesday',
      block: 'Block 1',
      age_min: 5,
      age_max: 12,
      age_display_mode: 'both' as const,
      current_enrollment: 0,
      created_at: '',
      updated_at: '',
      schedule_config: null,
      start_date: null,
      end_date: null,
      start_time: null,
      end_time: null,
      day_of_week: null,
      location: null,
    };

    render(
      <AdminClassForm
        initialData={classData}
        teachers={mockTeachers}
      />
    );

    expect(screen.getByLabelText(/age min/i)).toHaveValue(5);
    expect(screen.getByLabelText(/age max/i)).toHaveValue(12);
  });

  it('shows validation error when age_min exceeds age_max', async () => {
    const user = userEvent.setup();
    render(<AdminClassForm teachers={mockTeachers} />);

    const ageMinInput = screen.getByLabelText(/age min/i);
    const ageMaxInput = screen.getByLabelText(/age max/i);

    await user.clear(ageMinInput);
    await user.type(ageMinInput, '15');
    await user.clear(ageMaxInput);
    await user.type(ageMaxInput, '10');

    // Submit the form to trigger validation
    const submitButton = screen.getByRole('button', { name: /save class/i });
    await user.click(submitButton);

    expect(
      await screen.findByText(/age min cannot exceed age max/i)
    ).toBeInTheDocument();
  });

  it('renders age display mode radio group with three options', () => {
    render(<AdminClassForm teachers={mockTeachers} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByLabelText(/show only age ranges/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show only elementary.*ms.*hs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show both/i)).toBeInTheDocument();
  });

  it('defaults age display mode to "both" when creating a new class', () => {
    render(<AdminClassForm teachers={mockTeachers} />);
    const bothRadio = screen.getByLabelText(/show both/i);
    expect(bothRadio).toBeChecked();
  });

  it('pre-selects age display mode from initialData in edit mode', () => {
    const classData = {
      id: 'class-1',
      name: 'Art 101',
      description: '',
      capacity: 20,
      price: 30,
      status: 'draft' as const,
      teacher_id: 't1',
      day: 'Tuesday',
      block: 'Block 1',
      age_min: 5,
      age_max: 12,
      age_display_mode: 'pills' as const,
      current_enrollment: 0,
      created_at: '',
      updated_at: '',
      schedule_config: null,
      start_date: null,
      end_date: null,
      start_time: null,
      end_time: null,
      day_of_week: null,
      location: null,
    };

    render(
      <AdminClassForm
        initialData={classData}
        teachers={mockTeachers}
      />
    );

    const pillsRadio = screen.getByLabelText(/show only elementary.*ms.*hs/i);
    expect(pillsRadio).toBeChecked();
  });
});
