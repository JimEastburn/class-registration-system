import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SiteGateModal } from '../SiteGateModal';
import { verifySitePassword } from '@/lib/actions/site-gate';

vi.mock('@/lib/actions/site-gate', () => ({
  verifySitePassword: vi.fn(),
}));

// Mock next/image to avoid Invalid URL errors in test environment
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    return <img {...rest} data-fill={fill ? 'true' : undefined} data-priority={priority ? 'true' : undefined} />;
  },
}));

describe('SiteGateModal', () => {
  const mockOnSuccess = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password form when open', () => {
    render(
      <SiteGateModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Site Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter site password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SiteGateModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Site Access')).not.toBeInTheDocument();
  });

  it('calls verifySitePassword on submit and calls onSuccess on success', async () => {
    (verifySitePassword as any).mockResolvedValue({ success: true });

    render(
      <SiteGateModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByPlaceholderText('Enter site password');
    fireEvent.change(input, { target: { value: 'correct-password' } });

    const submitBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(verifySitePassword).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows error when verification fails', async () => {
    (verifySitePassword as any).mockResolvedValue({ error: 'Incorrect password' });

    render(
      <SiteGateModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByPlaceholderText('Enter site password');
    fireEvent.change(input, { target: { value: 'wrong-password' } });

    const submitBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it('displays contact information', () => {
    render(
      <SiteGateModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Jim Eastburn/)).toBeInTheDocument();
    expect(screen.getByText('(512) 689-6860')).toBeInTheDocument();
  });
});
