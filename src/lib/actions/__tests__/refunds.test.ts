
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefund } from '../refunds';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    refunds: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/actions/audit', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendWaitlistNotification: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('processRefund', () => {
  let mockBuilder: any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      then: vi.fn(),
      update: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };

    mockBuilder.select.mockReturnValue(mockBuilder);
    mockBuilder.eq.mockReturnValue(mockBuilder);
    mockBuilder.update.mockReturnValue(mockBuilder);
    mockBuilder.order.mockReturnValue(mockBuilder);
    mockBuilder.limit.mockReturnValue(mockBuilder);

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue(mockBuilder),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  it('should process a refund successfully', async () => {
    // Mock authenticated admin user
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-123' } } });
    
    // Mock profile check (admin)
    mockBuilder.single.mockResolvedValueOnce({ data: { role: 'admin' } });

    // Mock payment lookup
    mockBuilder.single.mockResolvedValueOnce({ 
      data: { 
        id: 'pay-123', 
        transaction_id: 'pi_123', 
        amount: 1000, 
        enrollment_id: 'enr-456' 
      } 
    });

    // Mock Stripe refund success
    (stripe.refunds.create as any).mockResolvedValue({ id: 're_123' });

    // Mock update payment success (update -> eq -> await builder)
    mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

    // Mock enrollment lookup
    mockBuilder.single.mockResolvedValueOnce({ data: { class_id: 'class-789' } });

    // Mock update enrollment success (update -> eq -> await builder)
    mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
    
    // Mock waitlist lookup (none found)
    mockBuilder.single.mockResolvedValueOnce({ data: null });

    const result = await processRefund({ paymentId: 'pay-123' });

    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data.refundId).toBe('re_123');
    }
    expect(stripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1000,
      payment_intent: 'pi_123'
    }));
  });

  it('should fail if user is not authorized', async () => {
    // Mock authenticated regular user
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    
    // Mock profile check (parent)
    mockBuilder.single.mockResolvedValueOnce({ data: { role: 'parent' } });

    const result = await processRefund({ paymentId: 'pay-123' });

    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBe('Not authorized to process refunds');
    }
  });

  it('should fail if payment is already refunded', async () => {
    // Mock admin
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'admin-123' } } });
    mockBuilder.single.mockResolvedValueOnce({ data: { role: 'admin' } });

    // Mock payment lookup (already refunded)
    mockBuilder.single.mockResolvedValueOnce({ 
      data: { 
        id: 'pay-123', 
        transaction_id: 'pi_123', 
        status: 'refunded'
      } 
    });

    const result = await processRefund({ paymentId: 'pay-123' });

    expect(result.success).toBe(false);
    if (!result.success) {
        expect(result.error).toBe('Payment is already refunded');
    }
  });
});
