import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminVolunteerConfig } from '../AdminVolunteerConfig';
import type { VolunteerBoardData } from '@/types';

const actionMocks = vi.hoisted(() => ({
  createVolunteerBlock: vi.fn(),
  createVolunteerRole: vi.fn(),
  deleteVolunteerBlock: vi.fn(),
  deleteVolunteerRole: vi.fn(),
  moveVolunteerBlock: vi.fn(),
  moveVolunteerRole: vi.fn(),
  moveVolunteerSignup: vi.fn(),
  removeVolunteerSignupAsAdmin: vi.fn(),
  renameVolunteerBlock: vi.fn(),
  renameVolunteerRole: vi.fn(),
  setVolunteerSlotRequired: vi.fn(),
}));

vi.mock('@/lib/actions/volunteers', () => actionMocks);

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const board: VolunteerBoardData = {
  roles: [
    {
      id: 'role-1',
      name: 'Door Monitor',
      description: 'Welcome families at the main entrance.',
      sort_order: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  blocks: [
    {
      id: 'block-1',
      name: 'Tuesday Block 1',
      sort_order: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  slots: [],
  signups: [],
  currentUserId: 'admin-1',
};

describe('AdminVolunteerConfig role descriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    actionMocks.createVolunteerRole.mockResolvedValue({
      success: true,
      data: board.roles[0],
    });
    actionMocks.renameVolunteerRole.mockResolvedValue({
      success: true,
      data: board.roles[0],
    });
  });

  it('submits a description when creating a volunteer role', async () => {
    render(
      <AdminVolunteerConfig
        board={board}
        activityLog={null}
        activityLogError={null}
      />
    );

    const roleSection = screen
      .getByRole('heading', { name: 'Volunteer roles' })
      .closest('section');
    expect(roleSection).not.toBeNull();
    fireEvent.click(within(roleSection!).getByRole('button', { name: 'Add' }));

    fireEvent.change(screen.getByLabelText('Volunteer role name'), {
      target: { value: 'Crossing Guard' },
    });
    const description = screen.getByLabelText('Volunteer role description');
    expect(description).toHaveAttribute('maxlength', '1000');
    fireEvent.change(description, {
      target: { value: 'Help families cross safely.\nWatch for traffic.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(actionMocks.createVolunteerRole).toHaveBeenCalledWith(
        'Crossing Guard',
        'Help families cross safely.\nWatch for traffic.'
      );
    });
  });

  it('loads and updates an existing volunteer role description', async () => {
    render(
      <AdminVolunteerConfig
        board={board}
        activityLog={null}
        activityLogError={null}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Rename Door Monitor' })
    );

    const description = await screen.findByLabelText(
      'Volunteer role description'
    );
    expect(description).toHaveValue('Welcome families at the main entrance.');
    fireEvent.change(description, {
      target: { value: 'Updated instructions.\nSecond line.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(actionMocks.renameVolunteerRole).toHaveBeenCalledWith(
        'role-1',
        'Door Monitor',
        'Updated instructions.\nSecond line.'
      );
    });
  });
});

describe('AdminVolunteerConfig overview and filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.ResizeObserver = class ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  const filterBoard: VolunteerBoardData = {
    roles: [
      {
        id: 'role-1',
        name: 'Door Monitor',
        description: null,
        sort_order: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'role-2',
        name: 'Crossing Guard',
        description: null,
        sort_order: 2,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    blocks: [
      {
        id: 'block-1',
        name: 'Tuesday Block 1',
        sort_order: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ],
    slots: [
      { id: 'slot-1', role_id: 'role-1', block_id: 'block-1', created_at: 'x' },
    ],
    signups: [
      {
        id: 'signup-1',
        slot_id: 'slot-1',
        block_id: 'block-1',
        user_id: 'user-1',
        display_name: 'Jim Eastburn',
        created_at: 'x',
      },
    ],
    currentUserId: 'admin-1',
  };

  // The required-slots matrix is the table whose corner header reads "Role".
  function matrixTable() {
    return screen.getByText('Role', { selector: 'th' }).closest('table')!;
  }

  it('summarizes the board with live counts', () => {
    render(
      <AdminVolunteerConfig
        board={filterBoard}
        activityLog={null}
        activityLogError={null}
      />
    );

    const stat = (label: string) =>
      screen.getByText(label).closest('div') as HTMLElement;

    expect(within(stat('Roles')).getByText('2')).toBeInTheDocument();
    expect(within(stat('Slots on board')).getByText('1')).toBeInTheDocument();
    expect(within(stat('Filled')).getByText('1')).toBeInTheDocument();
    expect(within(stat('Open')).getByText('0')).toBeInTheDocument();
  });

  it('filters the matrix rows by role name and shows an empty state', () => {
    render(
      <AdminVolunteerConfig
        board={filterBoard}
        activityLog={null}
        activityLogError={null}
      />
    );

    expect(within(matrixTable()).getByText('Door Monitor')).toBeInTheDocument();
    expect(
      within(matrixTable()).getByText('Crossing Guard')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter roles'), {
      target: { value: 'door' },
    });

    expect(within(matrixTable()).getByText('Door Monitor')).toBeInTheDocument();
    expect(
      within(matrixTable()).queryByText('Crossing Guard')
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter roles'), {
      target: { value: 'zzz' },
    });

    expect(
      within(matrixTable()).getByText(/No roles match/)
    ).toBeInTheDocument();
  });
});
