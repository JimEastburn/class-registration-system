import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VolunteerBoardV2Client } from '../VolunteerBoardV2Client';
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
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
    role('open-1', 'Opening YC Team - 1st Member', 5),
    role('open-2', 'Opening YC Team - 2nd Member', 6),
    role('gym', 'Door Monitor Gym', 7, 'Watch the gym doors.'),
    role('bathrooms', 'Check bathrooms, restock - YC and MB', 20),
    role('library', 'Library Upkeep', 21),
  ],
  blocks: [
    block('t-before', 'Tuesday before Block 1', 3),
    block('t1', 'Tuesday Block 1', 4),
    block('w1', 'Wednesday Block 1', 11),
    block('th1', 'Thursday Block 1', 17),
    block('weekly', 'Once per week', 23),
    block('t-once', 'Tuesday - once', 24),
  ],
  slots: [
    {
      id: 's-open-1',
      role_id: 'open-1',
      block_id: 't-before',
      created_at: 'x',
    },
    {
      id: 's-open-2',
      role_id: 'open-2',
      block_id: 't-before',
      created_at: 'x',
    },
    { id: 's-t1-gym', role_id: 'gym', block_id: 't1', created_at: 'x' },
    { id: 's-w1-gym', role_id: 'gym', block_id: 'w1', created_at: 'x' },
    { id: 's-th1-gym', role_id: 'gym', block_id: 'th1', created_at: 'x' },
    { id: 's-weekly', role_id: 'library', block_id: 'weekly', created_at: 'x' },
    {
      id: 's-t-once',
      role_id: 'bathrooms',
      block_id: 't-once',
      created_at: 'x',
    },
  ],
  signups: [
    {
      id: 'sg-1',
      slot_id: 's-t1-gym',
      block_id: 't1',
      user_id: 'user-1',
      display_name: 'Jim Eastburn',
      created_at: 'x',
    },
  ],
  currentUserId: 'user-1',
};

describe('VolunteerBoardV2Client', () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('renders exactly four columns and no role column', () => {
    render(<VolunteerBoardV2Client board={board} />);

    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual([
      'Your volunteer spots',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Other',
    ]);
  });

  it('labels entries with the role name and bracketed block, in chronological order', () => {
    render(<VolunteerBoardV2Client board={board} />);

    const tuesday = screen.getByRole('region', {
      name: 'Tuesday volunteer roles',
    });

    expect(
      within(tuesday)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('button')?.textContent)
    ).toEqual([
      'Opening YC Team - 1st Member [before Block 1]',
      'Opening YC Team - 2nd Member [before Block 1]',
      'Door Monitor Gym [Block 1]',
      'Check bathrooms, restock - YC and MB [once]',
    ]);
  });

  it('keeps once blocks in their day column and day-less blocks in Other', () => {
    render(<VolunteerBoardV2Client board={board} />);

    const other = screen.getByRole('region', {
      name: 'Other volunteer roles',
    });

    expect(
      within(other)
        .getAllByRole('listitem')
        .map((item) => item.querySelector('button')?.textContent)
    ).toEqual(['Library Upkeep [Once per week]']);
  });

  it('shows block sub-headers within a column', () => {
    render(<VolunteerBoardV2Client board={board} />);

    const tuesday = screen.getByRole('region', {
      name: 'Tuesday volunteer roles',
    });

    expect(
      within(tuesday)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['before Block 1', 'Block 1', 'once']);
  });

  it('offers a Volunteer button for open slots and Remove for the current user', () => {
    render(<VolunteerBoardV2Client board={board} />);

    const tuesday = screen.getByRole('region', {
      name: 'Tuesday volunteer roles',
    });

    expect(
      within(tuesday).getAllByRole('button', { name: /volunteer$/i })
    ).toHaveLength(3);
    expect(within(tuesday).getByText('You: Jim Eastburn')).toBeInTheDocument();
    expect(
      within(tuesday).getByRole('button', { name: /remove/i })
    ).toBeInTheDocument();
  });

  it('renders an empty state when the board has no slots', () => {
    render(
      <VolunteerBoardV2Client board={{ ...board, slots: [], signups: [] }} />
    );

    expect(screen.getByText('No volunteer slots yet')).toBeInTheDocument();
  });
});
