import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogWithUser } from '@/types';
import { AuditLogTable } from '../AuditLogTable';

const mockPush = vi.fn();
const { mockSearchParams } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));

const statusChangeLog: AuditLogWithUser = {
  id: 'audit-1',
  user_id: 'admin-123',
  action: 'UPDATE_ENROLLMENT_STATUS',
  target_type: 'enrollment',
  target_id: 'enrollment-456',
  details: {
    old_status: 'pending',
    new_status: 'confirmed',
    payment_id: 'payment-789',
  },
  created_at: '2026-08-31T15:00:00.000Z',
  profiles: {
    first_name: 'Ada',
    last_name: 'Admin',
    email: 'ada@example.com',
  },
};

function renderTable(data: AuditLogWithUser[] = [statusChangeLog]) {
  return render(
    <AuditLogTable data={data} count={data.length} page={1} limit={20} />
  );
}

describe('AuditLogTable', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchParams.current = new URLSearchParams();
  });

  it('shows the person and a useful change summary instead of the user ID', () => {
    renderTable();

    expect(
      screen.getByRole('columnheader', { name: 'Person' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'User ID' })).toBeNull();
    expect(screen.getByText('Ada Admin')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Status: Pending → Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('admin-123')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Export all audit logs' })
    ).toBeInTheDocument();
  });

  it('opens complete row details including IDs, raw details, and what changed', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByLabelText(
        'View audit details for Update enrollment status by Ada Admin'
      )
    );

    const dialog = screen.getByRole('dialog', { name: 'Audit log details' });
    expect(within(dialog).getByText('admin-123')).toBeInTheDocument();
    expect(within(dialog).getByText('enrollment-456')).toBeInTheDocument();
    expect(within(dialog).getByText('audit-1')).toBeInTheDocument();
    expect(within(dialog).getByText('What changed')).toBeInTheDocument();
    expect(within(dialog).getByText('Pending')).toBeInTheDocument();
    expect(within(dialog).getByText('Confirmed')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/"payment_id": "payment-789"/)
    ).toBeInTheDocument();
  });

  it('filters by person name or email', async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByLabelText('Person'), 'Ada Admin');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(mockPush).toHaveBeenCalledWith('?page=1&actor=Ada+Admin');
  });
});
