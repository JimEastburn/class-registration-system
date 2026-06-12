import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AllAacEnrollmentsTable } from '../AllAacEnrollmentsTable';
import type { AllAacEnrollmentReportRow } from '@/lib/actions/classes';

const rows: AllAacEnrollmentReportRow[] = [
  {
    id: 'class-1',
    className: 'Art Foundations',
    teacherName: 'Teacher Smith',
    capacity: 12,
    enrolledCount: 9,
    waitlistedCount: 3,
    block: 'Block 1',
    daysOffered: 'Tuesday only',
  },
];

describe('AllAacEnrollmentsTable', () => {
  it('renders the requested column headers', () => {
    render(<AllAacEnrollmentsTable rows={rows} />);

    expect(screen.getByText('Class Name')).toBeInTheDocument();
    expect(screen.getByText('Teacher Name')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
    expect(screen.getByText('Waitlisted')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.getByText('Days Offered')).toBeInTheDocument();
  });

  it('renders a sample class row', () => {
    render(<AllAacEnrollmentsTable rows={rows} />);

    expect(screen.getByText('Art Foundations')).toBeInTheDocument();
    expect(screen.getByText('Teacher Smith')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Block 1')).toBeInTheDocument();
    expect(screen.getByText('Tuesday only')).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<AllAacEnrollmentsTable rows={[]} />);

    expect(screen.getByText('No published classes found.')).toBeInTheDocument();
  });
});
