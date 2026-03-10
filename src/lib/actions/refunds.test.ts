import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processRefund } from '@/lib/actions/refunds';
import { stripe } from '@/lib/stripe';
import { revalidatePath } from 'next/cache';
import {
  seedFake,
  ADMIN_PROFILE,
  PARENT_PROFILE,
  type SeedPayment,
  type SeedEnrollment,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/stripe', () => ({ stripe: { refunds: { create: vi.fn() } } }));
vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/actions/waitlist', () => ({
  promoteFromWaitlist: vi.fn().mockResolvedValue({ success: true, data: null }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const completedPayment: SeedPayment = {
  id: 'pay-1', transaction_id: 'pi_123', amount: 1000,
  status: 'completed', enrollment_id: 'enr-1',
};

const confirmedEnrollment: SeedEnrollment = {
  id: 'enr-1', student_id: 'student-1', class_id: 'class-1',
  status: 'confirmed', waitlist_position: null,
};

const waitlistedEnrollment: SeedEnrollment = {
  id: 'enr-wait-1', student_id: 'student-2', class_id: 'class-1',
  status: 'waitlisted', waitlist_position: 1,
};

function seed(authUserId: string | null) {
  return seedFake({
    authUserId,
    data: {
      profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
      payments: [completedPayment] as unknown as Record<string, unknown>[],
      enrollments: [confirmedEnrollment, waitlistedEnrollment] as unknown as Record<string, unknown>[],
      classes: [{ id: 'class-1', name: 'Math 101', start_date: '2026-03-01' }] as Record<string, unknown>[],
      family_members: [
        { id: 'student-1', parent_id: 'parent-123', first_name: 'Kid', last_name: 'One' },
        { id: 'student-2', parent_id: 'parent-123', first_name: 'Next', last_name: 'Student' },
      ] as Record<string, unknown>[],
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Refund Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stripe.refunds.create).mockResolvedValue({ id: 're_123' } as never);
  });

  it('processes refund successfully with waitlist promotion', async () => {
    const fake = seed('admin-123');
    const result = await processRefund({ paymentId: 'pay-1' });

    expect(result.success).toBe(true);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_123', amount: 1000 })
    );
    expect(fake.db.payments.find((p) => p.id === 'pay-1')?.status).toBe('refunded');
    expect(fake.db.enrollments.find((e) => e.id === 'enr-1')?.status).toBe('cancelled');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/payments');
  });

  it('fails if non-admin', async () => {
    seed('parent-123');
    const result = await processRefund({ paymentId: 'pay-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Not authorized');
  });

  it('fails if payment not found', async () => {
    seed('admin-123');
    const result = await processRefund({ paymentId: 'nonexistent' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Payment not found');
  });
});
