import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllPayments, updatePaymentStatus } from '@/lib/actions/payments';
import {
  seedFake,
  ADMIN_PROFILE,
  PARENT_PROFILE,
  type SeedPayment,
  type SeedEnrollment,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

// ── Seed Data ───────────────────────────────────────────────────────────────

const payment1: SeedPayment = {
  id: 'pay-1', amount: 3000, status: 'pending',
  enrollment_id: 'enr-1', created_at: '2023-01-15T10:00:00Z',
};

const payment2: SeedPayment = {
  id: 'pay-2', amount: 5000, status: 'completed',
  enrollment_id: 'enr-2', created_at: '2023-01-20T10:00:00Z',
};

const enrollment1: SeedEnrollment = {
  id: 'enr-1', student_id: 'student-1', class_id: 'class-1', status: 'pending',
};

function seed(authUserId: string | null) {
  return seedFake({
    authUserId,
    data: {
      profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
      payments: [payment1, payment2] as unknown as Record<string, unknown>[],
      enrollments: [enrollment1] as unknown as Record<string, unknown>[],
      classes: [] as Record<string, unknown>[],
      family_members: [] as Record<string, unknown>[],
    },
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('getAllPayments Action', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should deny access if not authenticated', async () => {
    seed(null);
    expect((await getAllPayments()).error).toBe('Not authenticated');
  });

  it('should deny access if user is not admin', async () => {
    seed('parent-123');
    expect((await getAllPayments()).error).toBe('Access denied: Admin privileges required');
  });

  it('should fetch payments if user is admin', async () => {
    seed('admin-123');
    const result = await getAllPayments();
    expect(result.error).toBeNull();
    expect(result.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should apply status filter', async () => {
    seed('admin-123');
    const result = await getAllPayments({ status: 'completed' });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('pay-2');
  });

  it('should apply date filters', async () => {
    seed('admin-123');
    const result = await getAllPayments({ startDate: '2023-01-01', endDate: '2023-01-16' });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('pay-1');
  });

  it('should respect pagination via range', async () => {
    seed('admin-123');
    const result = await getAllPayments({ page: 1, limit: 1 });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
  });

  describe('updatePaymentStatus Action', () => {
    it('should deny access if not authenticated', async () => {
      seed(null);
      expect((await updatePaymentStatus('pay-1', 'completed')).error).toBe('Not authenticated');
    });

    it('should deny access if not admin', async () => {
      seed('parent-123');
      expect((await updatePaymentStatus('pay-1', 'completed')).error).toBe('Access denied: Admin privileges required');
    });

    it('should update payment status successfully', async () => {
      const fake = seed('admin-123');
      const result = await updatePaymentStatus('pay-1', 'failed');
      expect(result.success).toBe(true);
      expect(fake.db.payments.find((p) => p.id === 'pay-1')?.status).toBe('failed');
    });

    it('should confirm enrollment if payment completed', async () => {
      const fake = seed('admin-123');
      const result = await updatePaymentStatus('pay-1', 'completed');
      expect(result.success).toBe(true);
      expect(fake.db.payments.find((p) => p.id === 'pay-1')?.status).toBe('completed');
      expect(fake.db.enrollments.find((e) => e.id === 'enr-1')?.status).toBe('confirmed');
    });
  });
});
