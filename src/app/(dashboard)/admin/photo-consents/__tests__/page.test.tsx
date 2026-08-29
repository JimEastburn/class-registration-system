import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoConsentsPage from '../page';

const mockGetPhotoConsentRoster = vi.fn();

vi.mock('@/lib/actions/admin', () => ({
  getPhotoConsentRoster: () => mockGetPhotoConsentRoster(),
}));

describe('PhotoConsentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPhotoConsentRoster.mockResolvedValue({
      data: [
        {
          id: 'student-1',
          studentName: 'Student One',
          grade: 'elementary',
          photoConsent: true,
          parentName: 'Family Parent',
          parentEmail: 'family@example.com',
        },
        {
          id: 'student-2',
          studentName: 'Student Two',
          grade: null,
          photoConsent: false,
          parentName: 'Other Parent',
          parentEmail: 'other@example.com',
        },
      ],
      error: null,
    });
  });

  it('renders the student photo consent roster and summary', async () => {
    render(await PhotoConsentsPage());

    expect(
      screen.getByRole('heading', { name: 'Photo Consents' })
    ).toBeInTheDocument();
    expect(screen.getByText('Student One')).toBeInTheDocument();
    expect(screen.getByText('Family Parent')).toBeInTheDocument();
    expect(screen.getByText('Granted')).toBeInTheDocument();
    expect(screen.getByText('Not granted')).toBeInTheDocument();
  });

  it('does not expose roster data when authorization fails', async () => {
    mockGetPhotoConsentRoster.mockResolvedValue({
      data: null,
      error: 'Unauthorized',
    });

    render(await PhotoConsentsPage());

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('Student One')).not.toBeInTheDocument();
  });
});
