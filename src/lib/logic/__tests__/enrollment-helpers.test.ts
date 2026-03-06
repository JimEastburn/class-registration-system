import { describe, it, expect } from 'vitest';
import { computeEnrollmentStatusCounts } from '../enrollment-helpers';

describe('computeEnrollmentStatusCounts', () => {
  it('returns zeros for an empty array', () => {
    const result = computeEnrollmentStatusCounts([]);
    expect(result).toEqual({ enrolled: 0, confirmed: 0, waitlisted: 0 });
  });

  it('correctly counts mixed statuses', () => {
    const roster = [
      { status: 'pending' },
      { status: 'confirmed' },
      { status: 'confirmed' },
      { status: 'waitlisted' },
      { status: 'waitlisted' },
      { status: 'waitlisted' },
    ];
    const result = computeEnrollmentStatusCounts(
      roster as { status: string }[]
    );
    expect(result).toEqual({ enrolled: 1, confirmed: 2, waitlisted: 3 });
  });

  it('handles all-pending roster', () => {
    const roster = [
      { status: 'pending' },
      { status: 'pending' },
      { status: 'pending' },
    ];
    const result = computeEnrollmentStatusCounts(
      roster as { status: string }[]
    );
    expect(result).toEqual({ enrolled: 3, confirmed: 0, waitlisted: 0 });
  });

  it('handles all-confirmed roster', () => {
    const roster = [
      { status: 'confirmed' },
      { status: 'confirmed' },
    ];
    const result = computeEnrollmentStatusCounts(
      roster as { status: string }[]
    );
    expect(result).toEqual({ enrolled: 0, confirmed: 2, waitlisted: 0 });
  });
});
