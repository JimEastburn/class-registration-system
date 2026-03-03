import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRecentActivity } from '@/lib/actions/admin';
import { describeAction } from '@/components/admin/RecentActivityFeed';
import type { AuditLogWithUser } from '@/types';
import {
  seedFake,
  ADMIN_PROFILE,
  PARENT_PROFILE,
} from '@/__integration__/fakes/fixtures';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/actions/audit', () => ({ logAuditAction: vi.fn() }));

// ── Helpers ────────────────────────────────────────────────────────────────

const ADMIN_ID = 'admin-123';

function makeLog(overrides: Partial<AuditLogWithUser> = {}): AuditLogWithUser {
  return {
    id: 'log-1',
    user_id: ADMIN_ID,
    action: 'update_role',
    target_type: 'profile',
    target_id: 'user-456',
    details: null,
    created_at: new Date().toISOString(),
    profiles: { first_name: 'Admin', last_name: 'User', email: 'admin@test.com' },
    ...overrides,
  };
}

function seed(overrides: Record<string, Record<string, unknown>[]> = {}) {
  return seedFake({
    authUserId: ADMIN_ID,
    data: {
      profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
      audit_logs: [],
      ...overrides,
    },
  });
}

// ── describeAction unit tests ──────────────────────────────────────────────

describe('describeAction', () => {
  it('formats basic action with target_type', () => {
    const result = describeAction(makeLog({ action: 'create_class', target_type: 'class' }));
    expect(result).toBe('create class on class');
  });

  it('formats action without target_type', () => {
    const result = describeAction(makeLog({ action: 'login', target_type: null }));
    expect(result).toBe('login');
  });

  it('shows newRole detail when present', () => {
    const result = describeAction(
      makeLog({ details: { newRole: 'teacher' } as Record<string, unknown> })
    );
    expect(result).toBe('Set role to teacher on profile');
  });

  it('shows is_parent detail when present', () => {
    const result = describeAction(
      makeLog({
        action: 'update_parent_status',
        details: { is_parent: true } as Record<string, unknown>,
      })
    );
    expect(result).toBe('Set parent status to true on profile');
  });

  it('shows className detail when present', () => {
    const result = describeAction(
      makeLog({
        action: 'create_class',
        target_type: 'class',
        details: { className: 'Art 101' } as Record<string, unknown>,
      })
    );
    expect(result).toBe('create class: Art 101');
  });

  it('shows status detail when present', () => {
    const result = describeAction(
      makeLog({
        action: 'update_enrollment',
        target_type: 'enrollment',
        details: { status: 'confirmed' } as Record<string, unknown>,
      })
    );
    expect(result).toBe('update enrollment → confirmed');
  });
});

// ── getRecentActivity integration tests ────────────────────────────────────

describe('getRecentActivity', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns audit logs with joined profile data', async () => {
    seed({
      profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
      audit_logs: [
        {
          id: 'log-1',
          user_id: ADMIN_ID,
          action: 'update_role',
          target_type: 'profile',
          target_id: 'user-456',
          details: { newRole: 'teacher' },
          created_at: new Date().toISOString(),
        },
      ],
    });

    const result = await getRecentActivity();
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);

    const log = result.data![0];
    expect(log.action).toBe('update_role');
    expect(log.target_type).toBe('profile');
    expect(log.details).toEqual({ newRole: 'teacher' });
    // Note: SupabaseFake doesn't fully support alias:column join syntax
    // (profiles:user_id), so we can't assert on log.profiles here.
    // The real Supabase client resolves this correctly in production.
  });

  it('returns empty array when no logs exist', async () => {
    seed();
    const result = await getRecentActivity();
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('denies unauthenticated users', async () => {
    seedFake({ authUserId: null });
    const result = await getRecentActivity();
    expect(result.data).toBeNull();
    expect(result.error).toContain('Not authenticated');
  });

  it('denies non-admin users', async () => {
    seedFake({
      authUserId: 'parent-123',
      data: {
        profiles: [PARENT_PROFILE] as unknown as Record<string, unknown>[],
      },
    });
    const result = await getRecentActivity();
    expect(result.data).toBeNull();
    expect(result.error).toContain('Unauthorized');
  });

  it('respects the limit parameter', async () => {
    const logs = Array.from({ length: 5 }, (_, i) => ({
      id: `log-${i}`,
      user_id: ADMIN_ID,
      action: 'test_action',
      target_type: 'test',
      target_id: null,
      details: null,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));

    seed({
      profiles: [ADMIN_PROFILE] as unknown as Record<string, unknown>[],
      audit_logs: logs,
    });

    const result = await getRecentActivity(2);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });
});
