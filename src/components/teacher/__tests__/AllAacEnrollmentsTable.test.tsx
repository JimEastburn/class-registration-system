import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  {
    id: 'class-2',
    className: 'Biology Lab',
    teacherName: 'Ada Lovelace',
    capacity: 8,
    enrolledCount: 5,
    waitlistedCount: 2,
    block: 'Block 3',
    daysOffered: 'Wednesday only',
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

    const row = screen.getByRole('row', {
      name: /Art Foundations Teacher Smith 12 9 3 Block 1 Tuesday only/,
    });

    expect(within(row).getByText('Art Foundations')).toBeInTheDocument();
    expect(within(row).getByText('Teacher Smith')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(within(row).getByText('9')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(row).getByText('Block 1')).toBeInTheDocument();
    expect(within(row).getByText('Tuesday only')).toBeInTheDocument();
  });

  it('renders a total row for capacity, enrolled, and waitlisted', () => {
    render(<AllAacEnrollmentsTable rows={rows} />);

    const row = screen.getByRole('row', { name: /Total 20 14 5/ });

    expect(within(row).getByText('Total')).toBeInTheDocument();
    expect(within(row).getByText('20')).toBeInTheDocument();
    expect(within(row).getByText('14')).toBeInTheDocument();
    expect(within(row).getByText('5')).toBeInTheDocument();
  });

  it('sorts rows when a column header button is clicked', async () => {
    const user = userEvent.setup();
    render(<AllAacEnrollmentsTable rows={rows} />);

    await user.click(screen.getByRole('button', { name: /Sort by Capacity/ }));

    const renderedRows = screen.getAllByRole('row');
    expect(renderedRows[1]).toHaveTextContent('Biology Lab');
    expect(renderedRows[2]).toHaveTextContent('Art Foundations');
    expect(renderedRows[3]).toHaveTextContent('Total');
  });

  it('renders an empty state', () => {
    render(<AllAacEnrollmentsTable rows={[]} />);

    expect(screen.getByText('No published classes found.')).toBeInTheDocument();
  });
});
