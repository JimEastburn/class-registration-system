import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { FamilyMember } from '@/types';
import { FamilyMemberList } from '../FamilyMemberList';

const mockUpdatePhotoConsent = vi.fn();

vi.mock('@/lib/actions/family', () => ({
  updatePhotoConsent: (...args: unknown[]) => mockUpdatePhotoConsent(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../EditFamilyMemberDialog', () => ({
  EditFamilyMemberDialog: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../DeleteFamilyMemberDialog', () => ({
  DeleteFamilyMemberDialog: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../LinkStudentDialog', () => ({
  LinkStudentDialog: ({ trigger }: { trigger: ReactNode }) => trigger,
}));

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: 'student-1',
    parent_id: 'parent-1',
    student_user_id: null,
    first_name: 'Kid',
    last_name: 'User',
    email: 'kid@example.com',
    relationship: 'Student',
    grade: 'elementary',
    dob: null,
    age: 9,
    photo_consent: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('FamilyMemberList photo consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePhotoConsent.mockResolvedValue({ success: true, error: null });
  });

  it('shows one photo consent checkbox on each student card only', () => {
    render(
      <FamilyMemberList
        members={[
          makeMember(),
          makeMember({
            id: 'guardian-1',
            first_name: 'Parent',
            relationship: 'Parent/Guardian',
          }),
        ]}
      />
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(
      screen.getByRole('checkbox', {
        name: /consent to photographs of kid user/i,
      })
    ).toBeInTheDocument();
  });

  it('reflects persisted consent in the initial checkbox state', () => {
    render(
      <FamilyMemberList members={[makeMember({ photo_consent: true })]} />
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('persists a checked consent value', async () => {
    const user = userEvent.setup();
    render(<FamilyMemberList members={[makeMember()]} />);

    await user.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(mockUpdatePhotoConsent).toHaveBeenCalledWith('student-1', true);
      expect(toast.success).toHaveBeenCalledWith('Photo consent updated.');
    });
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('restores the prior state and reports an error when saving fails', async () => {
    mockUpdatePhotoConsent.mockResolvedValue({
      success: false,
      error: 'Could not save consent',
    });
    const user = userEvent.setup();
    render(<FamilyMemberList members={[makeMember()]} />);

    await user.click(screen.getByRole('checkbox'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not save consent');
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });
});
