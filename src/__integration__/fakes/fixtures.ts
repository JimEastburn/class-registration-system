/**
 * Shared test fixtures for SupabaseFake-based tests.
 *
 * Provides canonical seed profiles, type aliases, and a `seedFake()` helper
 * that wires a SupabaseFake to the mocked Supabase client(s).
 */

import { vi } from 'vitest';
import { SupabaseFake } from '@/__integration__/fakes/supabase';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  Profile,
  FamilyMember,
  Enrollment,
  Payment,
  Class,
  ClassBlock,
} from '@/types';
import type { Tables } from '@/types/database';

// ── Seed Type Aliases ───────────────────────────────────────────────────────
// Use Pick<> from real types to keep seed data aligned with the schema.

export type SeedProfile = Pick<
  Profile,
  'id' | 'first_name' | 'last_name' | 'role' | 'email'
> & {
  is_parent?: boolean;
  is_volunteer_admin?: boolean;
  is_photo_consent_admin?: boolean;
};

export type SeedFamilyMember = Pick<
  FamilyMember,
  'id' | 'parent_id' | 'first_name' | 'last_name' | 'email' | 'relationship'
>;

export type SeedClass = Pick<Class, 'id' | 'name' | 'teacher_id' | 'status'> & {
  price?: number;
  capacity?: number;
  day?: string | null;
  block?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  description?: string | null;
  schedule_config?: Record<string, unknown> | null;
  age_min?: number | null;
  age_max?: number | null;
};

export type SeedEnrollment = Pick<
  Enrollment,
  'id' | 'student_id' | 'class_id' | 'status'
> & {
  waitlist_position?: number | null;
  deposit_paid?: boolean;
  created_at?: string;
};

export type SeedPayment = Pick<
  Tables<'payments'>,
  'id' | 'amount' | 'status'
> & {
  enrollment_id?: string;
  transaction_id?: string | null;
  parent_id?: string;
  created_at?: string;
};

export type SeedBlock = Pick<
  ClassBlock,
  'id' | 'teacher_id' | 'student_id' | 'reason' | 'created_by' | 'created_at'
>;

// ── Canonical Profiles ──────────────────────────────────────────────────────
// Shared across nearly every test file. Override via `seedFake()` overrides
// only when the test needs a different set of profiles.

export const ADMIN_PROFILE: SeedProfile = {
  id: 'admin-123',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  email: 'admin@test.com',
};

export const PARENT_PROFILE: SeedProfile = {
  id: 'parent-123',
  first_name: 'Parent',
  last_name: 'User',
  role: 'parent',
  email: 'parent@test.com',
};

export const TEACHER_PROFILE: SeedProfile = {
  id: 'teacher-123',
  first_name: 'Teacher',
  last_name: 'Smith',
  role: 'teacher',
  email: 'teacher@test.com',
};

export const STUDENT_PROFILE: SeedProfile = {
  id: 'student-123',
  first_name: 'Student',
  last_name: 'User',
  role: 'student',
  email: 'student@test.com',
};

export const SCHEDULER_PROFILE: SeedProfile = {
  id: 'scheduler-123',
  first_name: 'Scheduler',
  last_name: 'User',
  role: 'class_scheduler',
  email: 'scheduler@test.com',
};

// ── seedFake() ──────────────────────────────────────────────────────────────
// Creates a SupabaseFake, sets the auth user, and wires it to both the
// `createClient` and `createAdminClient` mocks. Returns the fake so tests
// can assert on `fake.db`.

export interface SeedFakeOptions {
  /** Auth user ID. Pass `null` for unauthenticated tests. */
  authUserId: string | null;
  /** Override or add tables. Keys are table names, values are row arrays. */
  data?: Record<string, Record<string, unknown>[]>;
}

/**
 * Create a seeded SupabaseFake and wire it to the mocked Supabase clients.
 *
 * Usage:
 * ```ts
 * const fake = seedFake({
 *   authUserId: 'admin-123',
 *   data: {
 *     profiles: [ADMIN_PROFILE, PARENT_PROFILE] as unknown as Record<string, unknown>[],
 *     payments: [myPayment] as unknown as Record<string, unknown>[],
 *   },
 * });
 * ```
 */
export function seedFake({
  authUserId,
  data = {},
}: SeedFakeOptions): SupabaseFake {
  const fake = new SupabaseFake(data);

  if (authUserId) {
    fake.setAuthUser({ id: authUserId });
  }

  const fakeClient = fake as unknown as Awaited<
    ReturnType<typeof createClient>
  >;

  // Wire to both client mocks (either may be used by the action under test)
  try {
    vi.mocked(createClient).mockResolvedValue(fakeClient);
  } catch {
    /* not mocked in this test */
  }
  try {
    vi.mocked(createAdminClient).mockResolvedValue(fakeClient);
  } catch {
    /* not mocked in this test */
  }

  return fake;
}
