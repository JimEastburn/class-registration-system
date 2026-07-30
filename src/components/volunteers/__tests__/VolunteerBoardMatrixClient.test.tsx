import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VolunteerBoardMatrixClient } from '../VolunteerBoardMatrixClient';
import type {
  VolunteerBlock,
  VolunteerBoardData,
  VolunteerRole,
} from '@/types';

vi.mock('@/lib/actions/volunteers', () => ({
  claimVolunteerSlot: vi.fn(),
  releaseVolunteerSignup: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function role(
  id: string,
  name: string,
  sortOrder: number,
  description: string | null = null
): VolunteerRole {
  return {
    id,
    name,
    description,
    sort_order: sortOrder,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function block(id: string, name: string, sortOrder: number): VolunteerBlock {
  return {
    id,
    name,
    sort_order: sortOrder,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

const board: VolunteerBoardData = {
  roles: [
    role('board-t', 'Board Member (Treasurer)', 1),
    role('gym', 'Door Monitor Gym', 7, 'Watch the gym doors.'),
    role('mb-up', 'Door Monitor Main Building Upstairs', 8),
    role('library', 'Library Upkeep', 21),
  ],
  blocks: [
    block('years', 'One to two years (max 2 years)', 1),
    block('t1', 'Tuesday Block 1', 4),
    block('w1', 'Wednesday Block 1', 11),
    block('th1', 'Thursday Block 1', 17),
    block('weekly', 'Once per week', 23),
  ],
  slots: [
    { id: 's-years', role_id: 'board-t', block_id: 'years', created_at: 'x' },
    { id: 's-t1-gym', role_id: 'gym', block_id: 't1', created_at: 'x' },
    { id: 's-t1-mb', role_id: 'mb-up', block_id: 't1', created_at: 'x' },
    { id: 's-w1-gym', role_id: 'gym', block_id: 'w1', created_at: 'x' },
    { id: 's-th1-gym', role_id: 'gym', block_id: 'th1', created_at: 'x' },
    { id: 's-weekly', role_id: 'library', block_id: 'weekly', created_at: 'x' },
  ],
  signups: [
    {
      id: 'sg-1',
      slot_id: 's-t1-gym',
      block_id: 't1',
      user_id: 'me',
      display_name: 'Jim Eastburn',
      created_at: 'x',
    },
  ],
  currentUserId: 'me',
};

// The mobile cards render alongside the desktop table in jsdom (only hidden by
// CSS), so scope content/count assertions to the table to avoid double-counting.
function table() {
  return screen.getByRole('table');
}

function desktopColumnHeaders() {
  return within(table())
    .getAllByRole('columnheader')
    .map((header) => header.textContent);
}

function rowHeaders() {
  return within(table())
    .getAllByRole('rowheader')
    .map((header) => header.textContent);
}

describe('VolunteerBoardMatrixClient', () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('keeps the four columns with blocks as rows', () => {
    render(
      <VolunteerBoardMatrixClient board={board} otherMode="rows-bottom" />
    );

    // Headers are uppercased with CSS, so textContent keeps the source casing.
    expect(desktopColumnHeaders()).toEqual([
      'Block',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Other',
    ]);
  });

  it('shares a block-time row across day columns and drops the redundant bracket', () => {
    render(
      <VolunteerBoardMatrixClient board={board} otherMode="rows-bottom" />
    );

    // Block 1 row lists Tuesday's two roles and Wednesday/Thursday's one each,
    // by plain role name (no "[Block 1]" suffix).
    expect(
      within(table()).getByRole('button', {
        name: 'Door Monitor Main Building Upstairs',
      })
    ).toBeInTheDocument();
    expect(
      within(table()).getAllByRole('button', { name: 'Door Monitor Gym' })
    ).toHaveLength(3);
    expect(
      within(table()).queryByRole('button', { name: /\[/ })
    ).not.toBeInTheDocument();
  });

  it('rows-bottom mode puts Other blocks after the day rows', () => {
    render(
      <VolunteerBoardMatrixClient board={board} otherMode="rows-bottom" />
    );

    expect(rowHeaders()).toEqual([
      'Block 1',
      'One to two years (max 2 years)',
      'Once per week',
    ]);
  });

  it('natural mode positions Other blocks by sort order', () => {
    render(<VolunteerBoardMatrixClient board={board} otherMode="natural" />);

    expect(rowHeaders()).toEqual([
      'One to two years (max 2 years)',
      'Block 1',
      'Once per week',
    ]);
  });

  it('merged-cell mode drops Other rows but still lists Other roles in one cell', () => {
    render(
      <VolunteerBoardMatrixClient board={board} otherMode="merged-cell" />
    );

    expect(rowHeaders()).toEqual(['Block 1']);
    expect(desktopColumnHeaders()).toContain('Other');
    // The Other roles still render, grouped under their block labels.
    expect(
      within(table()).getByRole('button', { name: 'Board Member (Treasurer)' })
    ).toBeInTheDocument();
    expect(
      within(table()).getByRole('button', { name: 'Library Upkeep' })
    ).toBeInTheDocument();
  });

  it('shows the current user chip with a remove control and Volunteer for open slots', () => {
    render(
      <VolunteerBoardMatrixClient board={board} otherMode="rows-bottom" />
    );

    expect(within(table()).getByText('You: Jim Eastburn')).toBeInTheDocument();
    expect(
      within(table()).getByRole('button', { name: /remove/i })
    ).toBeInTheDocument();
    // Every unclaimed slot offers a Volunteer button (5 open of 6 slots).
    expect(
      within(table()).getAllByRole('button', { name: /^volunteer$/i })
    ).toHaveLength(5);
  });

  it('renders an empty state when the board has no slots', () => {
    render(
      <VolunteerBoardMatrixClient
        board={{ ...board, slots: [], signups: [] }}
        otherMode="rows-bottom"
      />
    );

    expect(screen.getByText('No volunteer slots yet')).toBeInTheDocument();
  });
});
