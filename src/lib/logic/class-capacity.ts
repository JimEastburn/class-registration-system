/**
 * The single definition of "is this class full?".
 *
 * A seat is held by a 'confirmed' OR a 'pending' enrollment, and a class is full
 * when seats taken >= capacity. This mirrors the enroll_student() database
 * function exactly — it is what actually decides whether the next registration
 * becomes 'pending' or 'waitlisted', so any indicator that disagrees with it is
 * lying to the user.
 *
 * Note: classes.current_enrollment is NOT this number. Its trigger counts
 * 'confirmed' only, so it under-reports (and reads 0 across the board while the
 * enrollment lifecycle stops at 'pending'). Do not use it for capacity.
 */

/** At or below this many seats remaining, a class is flagged as filling up. */
export const LOW_SEAT_THRESHOLD = 3;

export type CapacityState = 'open' | 'limited' | 'full';

/** Seats held. Both confirmed and pending enrollments hold one. */
export function getSeatsTaken(counts: {
  confirmed_count: number;
  pending_count: number;
}): number {
  return counts.confirmed_count + counts.pending_count;
}

/** Seats left before the next registration is waitlisted. Never negative. */
export function getSeatsRemaining(
  seatsTaken: number,
  capacity: number
): number {
  return Math.max(0, capacity - seatsTaken);
}

/**
 * 'full'    — the next registration goes to the waitlist
 * 'limited' — filling up; only LOW_SEAT_THRESHOLD or fewer seats left
 * 'open'    — room to spare
 */
export function getCapacityState(
  seatsTaken: number,
  capacity: number
): CapacityState {
  const remaining = getSeatsRemaining(seatsTaken, capacity);
  if (remaining === 0) return 'full';
  if (remaining <= LOW_SEAT_THRESHOLD) return 'limited';
  return 'open';
}

/** Convenience for the common `enrolled_count >= capacity` check. */
export function isClassFull(seatsTaken: number, capacity: number): boolean {
  return getCapacityState(seatsTaken, capacity) === 'full';
}
