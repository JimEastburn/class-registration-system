import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SchedulerClassTable } from '../SchedulerClassTable';
import { Class } from '@/types';
import { toast } from 'sonner';

// Mock dependencies
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSchedulerUpdateClass = vi.fn();
vi.mock('@/lib/actions/scheduler', () => ({
  schedulerUpdateClass: (...args: unknown[]) => mockSchedulerUpdateClass(...args),
}));

// Factory for test class data
function makeClass(overrides: Partial<Class> = {}): Class & { teacher?: { first_name: string | null; last_name: string | null; email: string } } {
  return {
    id: 'cls-1',
    name: 'Test Art Class',
    description: 'A test class',
    teacher_id: 'teacher-1',
    status: 'draft',
    price: 3000,
    capacity: 10,
    location: 'Room 101',
    age_min: 5,
    age_max: 12,
    day: 'Tuesday/Thursday',
    block: 'Block 1',
    start_date: '2026-03-01',
    end_date: '2026-05-01',
    schedule_config: {
      day: 'Tuesday/Thursday',
      block: 'Block 1',
      startDate: '2026-03-01',
      endDate: '2026-05-01',
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    teacher: {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    },
    ...overrides,
  } as Class & { teacher?: { first_name: string | null; last_name: string | null; email: string } };
}

describe('SchedulerClassTable - Published Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSchedulerUpdateClass.mockResolvedValue({ success: true });
  });

  it('renders a toggle switch for each class', () => {
    const classes = [makeClass(), makeClass({ id: 'cls-2', name: 'Second Class' })];
    render(<SchedulerClassTable classes={classes} count={2} />);

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);
  });

  it('shows toggle unchecked for draft classes', () => {
    render(<SchedulerClassTable classes={[makeClass({ status: 'draft' })]} count={1} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('shows toggle checked for published classes', () => {
    render(<SchedulerClassTable classes={[makeClass({ status: 'published' })]} count={1} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('disables toggle for completed classes', () => {
    render(<SchedulerClassTable classes={[makeClass({ status: 'completed' })]} count={1} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('disables toggle for cancelled classes', () => {
    render(<SchedulerClassTable classes={[makeClass({ status: 'cancelled' })]} count={1} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('calls schedulerUpdateClass with published when toggling a draft class on', async () => {
    const user = userEvent.setup();
    const cls = makeClass({ status: 'draft' });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(mockSchedulerUpdateClass).toHaveBeenCalledWith('cls-1', { status: 'published' });
  });

  it('calls schedulerUpdateClass with draft when toggling a published class off', async () => {
    const user = userEvent.setup();
    const cls = makeClass({ status: 'published' });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(mockSchedulerUpdateClass).toHaveBeenCalledWith('cls-1', { status: 'draft' });
  });

  it('shows success toast after toggling to published', async () => {
    const user = userEvent.setup();
    render(<SchedulerClassTable classes={[makeClass({ status: 'draft' })]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(toast.success).toHaveBeenCalledWith('Class "Test Art Class" published');
  });

  it('shows success toast after toggling to draft', async () => {
    const user = userEvent.setup();
    render(<SchedulerClassTable classes={[makeClass({ status: 'published' })]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(toast.success).toHaveBeenCalledWith('Class "Test Art Class" set to draft');
  });

  it('shows error toast on failure', async () => {
    mockSchedulerUpdateClass.mockResolvedValue({ success: false, error: 'Server error' });
    const user = userEvent.setup();
    render(<SchedulerClassTable classes={[makeClass({ status: 'draft' })]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(toast.error).toHaveBeenCalledWith('Server error');
  });

  it('blocks publishing when day is missing and shows error toast', async () => {
    const user = userEvent.setup();
    const cls = makeClass({
      status: 'draft',
      schedule_config: { day: '', block: 'Block 1', startDate: '2026-03-01', endDate: '2026-05-01' } as any,
    });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(mockSchedulerUpdateClass).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Day and Block must be assigned before publishing.');
  });

  it('blocks publishing when block is missing and shows error toast', async () => {
    const user = userEvent.setup();
    const cls = makeClass({
      status: 'draft',
      schedule_config: { day: 'Tuesday/Thursday', block: '', startDate: '2026-03-01', endDate: '2026-05-01' } as any,
    });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(mockSchedulerUpdateClass).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Day and Block must be assigned before publishing.');
  });

  it('blocks publishing when schedule_config is null', async () => {
    const user = userEvent.setup();
    const cls = makeClass({
      status: 'draft',
      schedule_config: null as any,
    });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(mockSchedulerUpdateClass).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Day and Block must be assigned before publishing.');
  });

  it('allows unpublishing without day/block validation', async () => {
    const user = userEvent.setup();
    // A published class that somehow has no schedule — unpublishing should still work
    const cls = makeClass({
      status: 'published',
      schedule_config: null as any,
    });
    render(<SchedulerClassTable classes={[cls]} count={1} />);

    await user.click(screen.getByRole('switch'));

    expect(mockSchedulerUpdateClass).toHaveBeenCalledWith('cls-1', { status: 'draft' });
  });

  it('keeps the Status column badge visible alongside the toggle', () => {
    render(<SchedulerClassTable classes={[makeClass({ status: 'draft' })]} count={1} />);

    // Status badge should still render
    expect(screen.getByText('draft')).toBeInTheDocument();
    // Toggle should also exist
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders Published column header', () => {
    render(<SchedulerClassTable classes={[]} count={0} />);

    expect(screen.getByText('Published')).toBeInTheDocument();
    // Status header should also still exist
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
