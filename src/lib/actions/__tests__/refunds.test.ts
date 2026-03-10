import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefund } from '../refunds';
import { stripe } from '@/lib/stripe';
import {
  seedFake,
  ADMIN_PROFILE,
  PARENT_PROFILE,
  type SeedPayment,
  type SeedEnrollment,
} from '@/__integration__/fakes/fixtures';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: { refunds: { create: vi.fn() } },
}));

vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/actions/waitlist', () => ({
  promoteFromWaitlist: vi.fn().mockResolvedValue({ success: true, data: null }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const pendingPayment: SeedPayment = {
  id: 'pay-123', transaction_id: 'pi_123', amount: 1000,
  status: 'completed', enrollment_id: 'enr-456',
};

const refundedPayment: SeedPayment = {
  id: 'pay-refunded', transaction_id: 'pi_456', amount: 2000,
  status: 'refunded', enrollment_id: 'enr-789',
};

const enrollment: SeedEnrollment = {
  id: 'enr-456', student_id: 'student-1', class_id: 'class-789', status: 'confirmed',
};

function seed(authUserId: string | null) {
  return seedFake({
    authUserId,
    data: {
      profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
      payments: [pendingPayment, refundedPayment] as unknown as Record<string, unknown>[],
      enrollments: [enrollment] as unknown as Record<string, unknown>[],
      classes: [{ id: 'class-789', name: 'Math 101' }] as Record<string, unknown>[],
      family_members: [{ id: 'student-1', parent_id: 'parent-123', first_name: 'Kid', last_name: 'Test' }] as Record<string, unknown>[],
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('processRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stripe.refunds.create).mockResolvedValue({ id: 're_123' } as never);
  });

  it('should process a refund successfully', async () => {
    const fake = seed('admin-123');

    const result = await processRefund({ paymentId: 'pay-123' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.refundId).toBe('re_123');
    }
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, payment_intent: 'pi_123' })
    );

    // Verify state
    expect(fake.db.payments.find((p) => p.id === 'pay-123')?.status).toBe('refunded');
    expect(fake.db.enrollments.find((e) => e.id === 'enr-456')?.status).toBe('cancelled');
  });

  it('should fail if user is not authorized', async () => {
    seed('parent-123');
    const result = await processRefund({ paymentId: 'pay-123' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Not authorized to process refunds');
  });

  it('should fail if payment is already refunded', async () => {
    seed('admin-123');
    const result = await processRefund({ paymentId: 'pay-refunded' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Payment is already refunded');
  });
});
