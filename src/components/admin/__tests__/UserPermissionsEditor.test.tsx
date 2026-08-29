import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { UserPermissionsEditor } from '../UserPermissionsEditor';

const mockUpdatePhotoConsentAdminStatus = vi.fn();

vi.mock('@/lib/actions/admin', () => ({
  updateParentStatus: vi.fn(),
  updateVolunteerAdminStatus: vi.fn(),
  updatePhotoConsentAdminStatus: (...args: unknown[]) =>
    mockUpdatePhotoConsentAdminStatus(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../UserRoleSelect', () => ({
  UserRoleSelect: () => <span>Role selector</span>,
}));

vi.mock('../ChangeRoleDialog', () => ({
  ChangeRoleDialog: () => null,
}));

describe('UserPermissionsEditor photo consent access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePhotoConsentAdminStatus.mockResolvedValue({
      success: true,
      error: null,
    });
  });

  it('renders the Photo Consent Administrator Access toggle', () => {
    render(
      <UserPermissionsEditor
        userId="user-1"
        currentRole="parent"
        isParent
        isVolunteerAdmin={false}
        isPhotoConsentAdmin={false}
      />
    );

    expect(
      screen.getByRole('switch', {
        name: 'Photo Consent Administrator Access',
      })
    ).not.toBeChecked();
  });

  it('persists newly granted photo consent administrator access', async () => {
    const user = userEvent.setup();
    render(
      <UserPermissionsEditor
        userId="user-1"
        currentRole="parent"
        isParent
        isVolunteerAdmin={false}
        isPhotoConsentAdmin={false}
      />
    );

    await user.click(
      screen.getByRole('switch', {
        name: 'Photo Consent Administrator Access',
      })
    );

    await waitFor(() => {
      expect(mockUpdatePhotoConsentAdminStatus).toHaveBeenCalledWith(
        'user-1',
        true
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Photo consent administrator access enabled'
      );
    });
  });
});
