/**
 * Compute enrollment status counts from a roster array.
 *
 * - enrolled  = status 'pending' (enrolled but not yet paid)
 * - confirmed = status 'confirmed' (confirmed & paid)
 * - waitlisted = status 'waitlisted'
 */
export function computeEnrollmentStatusCounts(
  roster: { status: string }[]
): { enrolled: number; confirmed: number; waitlisted: number } {
  let enrolled = 0;
  let confirmed = 0;
  let waitlisted = 0;

  for (const item of roster) {
    switch (item.status) {
      case 'pending':
        enrolled++;
        break;
      case 'confirmed':
        confirmed++;
        break;
      case 'waitlisted':
        waitlisted++;
        break;
    }
  }

  return { enrolled, confirmed, waitlisted };
}
