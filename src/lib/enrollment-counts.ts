import type { createClient } from '@/lib/supabase/server';

/**
 * Per-class enrollment tallies.
 *
 * enrolled_count = confirmed + pending, because both hold a seat. Cancelled
 * enrollments are excluded entirely. See lib/logic/class-capacity for the
 * "is it full?" rules built on top of these.
 */
export interface EnrollmentCounts {
  enrolled_count: number;
  pending_count: number;
  confirmed_count: number;
  waitlisted_count: number;
}

export const EMPTY_COUNTS: EnrollmentCounts = {
  enrolled_count: 0,
  pending_count: 0,
  confirmed_count: 0,
  waitlisted_count: 0,
};

/**
 * Tally enrollments by status for the given classes.
 *
 * This goes through the get_class_enrollment_counts RPC rather than querying
 * enrollments directly: the "Parents can view own enrollments" RLS policy would
 * otherwise limit the tally to the caller's own family, reporting a full class as
 * empty. The function is SECURITY DEFINER and returns aggregate integers only.
 *
 * Lives outside the 'use server' action modules so it can be shared as a plain
 * helper rather than becoming a callable server action.
 */
export async function getEnrollmentCountsByClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classIds: string[]
): Promise<Map<string, EnrollmentCounts>> {
  const counts = new Map<string, EnrollmentCounts>();
  if (classIds.length === 0) return counts;

  const { data: rows } = await supabase.rpc('get_class_enrollment_counts', {
    p_class_ids: classIds,
  });

  for (const row of rows || []) {
    counts.set(row.class_id, {
      enrolled_count: row.confirmed_count + row.pending_count,
      pending_count: row.pending_count,
      confirmed_count: row.confirmed_count,
      waitlisted_count: row.waitlisted_count,
    });
  }

  return counts;
}
