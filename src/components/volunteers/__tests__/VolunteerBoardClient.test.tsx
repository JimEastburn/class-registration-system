import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VolunteerBoardClient } from '../VolunteerBoardClient';
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

const tuesdayBlocks = [
  block('t1', 'Tuesday Block 1', 1),
  block('t2', 'Tuesday Block 2', 2),
  block('tl', 'Tuesday lunch', 3),
  block('t3', 'Tuesday Block 3', 4),
  block('t4', 'Tuesday Block 4', 5),
  block('ta', 'Tuesday after Block 4', 6),
];

const board: VolunteerBoardData = {
  roles: [
    role(
      'r1',
      'Door Monitor',
      1,
      'Welcome arriving families.\nKeep the entrance clear.'
    ),
  ],
  blocks: [
    ...tuesdayBlocks,
    block('w1', 'Wednesday Block 1', 7),
    block('once', 'Once per week', 18),
    block('to', 'Tuesday - once', 19),
    block('wo', 'Wednesday - once', 20),
    block('tho', 'Thursday - once', 21),
  ],
  slots: [
    { id: 's-t1', role_id: 'r1', block_id: 't1', created_at: '2026-01-01' },
    { id: 's-w1', role_id: 'r1', block_id: 'w1', created_at: '2026-01-01' },
    {
      id: 's-once',
      role_id: 'r1',
      block_id: 'once',
      created_at: '2026-01-01',
    },
  ],
  signups: [],
  currentUserId: 'user-1',
};

describe('VolunteerBoardClient day column groups', () => {
  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  it('renders day group headers and keeps once columns outside day groups', () => {
    render(<VolunteerBoardClient board={board} />);

    expect(
      screen.getByRole('button', {
        name: /collapse tuesday volunteer columns/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Tuesday Block 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Tuesday after Block 4' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Once per week' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Tuesday - once' })
    ).toBeInTheDocument();
  });

  it('collapses a day without rendering noisy hidden placeholders down the table', () => {
    render(<VolunteerBoardClient board={board} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /collapse tuesday volunteer columns/i,
      })
    );

    expect(
      screen.getByRole('button', { name: /expand tuesday volunteer columns/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Tuesday Block 1' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Tuesday after Block 4' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Tuesday hidden/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Show 6/i)).not.toBeInTheDocument();

    expect(
      screen.getByRole('columnheader', { name: 'Wednesday Block 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Once per week' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Tuesday - once' })
    ).toBeInTheDocument();

    const row = screen.getByRole('row', { name: /Door Monitor/i });
    expect(within(row).getByText('Door Monitor')).toBeInTheDocument();
  });

  it('opens the role description from the role name or information icon', () => {
    render(<VolunteerBoardClient board={board} />);

    const roleNameButtons = screen.getAllByRole('button', {
      name: 'Door Monitor',
    });
    const infoButtons = screen.getAllByRole('button', {
      name: 'Information about Door Monitor',
    });

    expect(roleNameButtons).toHaveLength(2);
    expect(infoButtons).toHaveLength(2);

    fireEvent.click(roleNameButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Door Monitor' })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent(
      'Welcome arriving families. Keep the entrance clear.'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(infoButtons[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps information icons clickable even when a role has no description', () => {
    render(
      <VolunteerBoardClient
        board={{ ...board, roles: [role('r1', 'Door Monitor', 1)] }}
      />
    );

    const infoButtons = screen.getAllByRole('button', {
      name: 'Information about Door Monitor',
    });
    expect(infoButtons.length).toBeGreaterThan(0);
    for (const button of infoButtons) {
      expect(button).not.toBeDisabled();
    }

    fireEvent.click(infoButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Door Monitor' })
    ).toBeInTheDocument();
    // The old hard-coded contact message must not reappear anywhere.
    expect(dialog).not.toHaveTextContent(/text Jim Eastburn/i);
  });
});
