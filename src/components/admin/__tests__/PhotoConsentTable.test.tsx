import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { adminUpdatePhotoConsent } from '@/lib/actions/admin';
import type { PhotoConsentRosterMember } from '@/lib/actions/admin';
import { PhotoConsentTable } from '../PhotoConsentTable';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/actions/admin', () => ({ adminUpdatePhotoConsent: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminUpdatePhotoConsent).mockResolvedValue({
    success: true,
    error: null,
  });
});

const rows: PhotoConsentRosterMember[] = [
  {
    id: 'student-zed',
    studentName: 'Zed Student',
    grade: 'middle school',
    photoConsent: true,
    parentName: 'Alpha Parent',
    parentEmail: 'zed-family@example.com',
  },
  {
    id: 'student-amy',
    studentName: 'Amy Student',
    grade: 'elementary',
    photoConsent: false,
    parentName: 'Zulu Parent',
    parentEmail: 'amy-family@example.com',
  },
  {
    id: 'student-moe',
    studentName: 'Moe Student',
    grade: 'high school',
    photoConsent: true,
    parentName: 'Middle Parent',
    parentEmail: 'moe-family@example.com',
  },
];

function firstStudentName() {
  const firstRow = screen.getAllByTestId('photo-consent-row')[0];
  return within(firstRow).getAllByRole('cell')[0].textContent;
}

describe('PhotoConsentTable sorting', () => {
  it('sorts by student name ascending by default and descending on click', async () => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);

    expect(firstStudentName()).toBe('Amy Student');

    await user.click(
      screen.getByRole('button', { name: /Sort by Student descending/ })
    );

    expect(firstStudentName()).toBe('Zed Student');
  });

  it.each([
    ['Grade', 'Amy Student'],
    ['Parent or Guardian', 'Zed Student'],
    ['Email', 'Amy Student'],
    ['Photo Consent', 'Amy Student'],
  ])('sorts by %s when its header is clicked', async (label, expectedFirst) => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`Sort by ${label} ascending`),
      })
    );

    expect(firstStudentName()).toBe(expectedFirst);
  });

  it('toggles the active column from ascending to descending', async () => {
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);
    const emailSort = screen.getByRole('button', {
      name: /Sort by Email ascending/,
    });

    await user.click(emailSort);
    expect(firstStudentName()).toBe('Amy Student');

    await user.click(
      screen.getByRole('button', { name: /Sort by Email descending/ })
    );
    expect(firstStudentName()).toBe('Zed Student');
  });
});

describe('PhotoConsentTable consent controls', () => {
  it.each([
    ['Grant', 'Amy Student', 'student-amy', true],
    ['Remove', 'Zed Student', 'student-zed', false],
  ] as const)(
    '%s consent and refreshes the roster, counts, and activity log',
    async (verb, name, id, consent) => {
      const user = userEvent.setup();
      const { rerender } = render(<PhotoConsentTable rows={rows} />);

      await user.click(
        screen.getByRole('button', {
          name: `${verb} photo consent for ${name}`,
        })
      );

      expect(adminUpdatePhotoConsent).toHaveBeenCalledExactlyOnceWith(
        id,
        consent
      );
      expect(refresh).toHaveBeenCalledOnce();
      expect(toast.success).toHaveBeenCalled();

      rerender(
        <PhotoConsentTable
          rows={rows.map((row) =>
            row.id === id ? { ...row, photoConsent: consent } : row
          )}
        />
      );
      const updatedRow = screen
        .getAllByTestId('photo-consent-row')
        .find((row) => within(row).queryByText(name))!;
      expect(
        within(updatedRow).getByText(consent ? 'Granted' : 'Not granted')
      ).toBeVisible();
      expect(
        within(updatedRow).getByRole('button', {
          name: `${consent ? 'Remove' : 'Grant'} photo consent for ${name}`,
        })
      ).toBeEnabled();
    }
  );

  it('disables the control while saving to prevent duplicate submissions', async () => {
    let finish!: (value: { success: boolean; error: string | null }) => void;
    vi.mocked(adminUpdatePhotoConsent).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const user = userEvent.setup();
    render(<PhotoConsentTable rows={rows} />);
    const button = screen.getByRole('button', {
      name: 'Grant photo consent for Amy Student',
    });

    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(adminUpdatePhotoConsent).toHaveBeenCalledOnce();

    await act(async () => finish({ success: true, error: null }));
    await waitFor(() => expect(button).toBeEnabled());
  });

  it.each(['rejected', 'thrown'])(
    'keeps the saved consent visible after a %s request',
    async (failure) => {
      if (failure === 'rejected') {
        vi.mocked(adminUpdatePhotoConsent).mockResolvedValue({
          success: false,
          error: 'Unauthorized',
        });
      } else {
        vi.mocked(adminUpdatePhotoConsent).mockRejectedValue(
          new Error('Network unavailable')
        );
      }
      const user = userEvent.setup();
      render(<PhotoConsentTable rows={rows} />);
      const button = screen.getByRole('button', {
        name: 'Grant photo consent for Amy Student',
      });

      await user.click(button);

      expect(screen.getByText('Not granted')).toBeVisible();
      expect(button).toBeEnabled();
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    }
  );
});
