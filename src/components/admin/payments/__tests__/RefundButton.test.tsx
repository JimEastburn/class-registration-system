
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefundButton } from '../RefundButton';
import { processRefund } from '@/lib/actions/refunds';

// Mock UI components if necessary, but usually shallow render or full render is fine with Shadcn
// We mock the server action
vi.mock('@/lib/actions/refunds', () => ({
  processRefund: vi.fn(),
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('RefundButton', () => {
  const defaultProps = {
    paymentId: 'pay-123',
    amount: 5000,
    currency: 'usd',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<RefundButton {...defaultProps} />);
    expect(screen.getByText('Refund')).toBeInTheDocument();
  });

  it('opens dialog on click', () => {
    render(<RefundButton {...defaultProps} />);
    
    // Click button
    fireEvent.click(screen.getByText('Refund'));
    
    // Check if dialog content appears
    expect(screen.getByRole('heading', { name: 'Confirm Refund' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount (USD)')).toHaveValue(50); // 5000 cents = 50.00
  });

  it('calls processRefund when confirmed', async () => {
    (processRefund as Mock).mockResolvedValue({ success: true, data: { refundId: '123' } });
    render(<RefundButton {...defaultProps} />);
    
    // Open Dialog
    fireEvent.click(screen.getByText('Refund'));
    
    // Confirm
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Refund' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
        expect(processRefund).toHaveBeenCalledWith({
            paymentId: 'pay-123',
            amount: 5000,
            reason: 'requested_by_customer'
        });
    });
  });

  // Note: Testing the interaction inside the dialog (clicking confirm) is essentially testing RefundConfirmDialog integration
  // We can do a basic check here.
});
