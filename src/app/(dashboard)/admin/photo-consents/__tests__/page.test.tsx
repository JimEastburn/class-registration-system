import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhotoConsentsPage from '../page';

const mockGetPhotoConsentRoster = vi.fn();
const mockGetPhotoConsentActivityLog = vi.fn();

vi.mock('@/lib/actions/admin', () => ({
  getPhotoConsentRoster: () => mockGetPhotoConsentRoster(),
  getPhotoConsentActivityLog: (page: number) =>
    mockGetPhotoConsentActivityLog(page),
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
    mockGetPhotoConsentActivityLog.mockResolvedValue({
      data: {
        entries: [
          {
            id: 'activity-1',
            action: 'consent',
            parent_id: 'parent-1',
            student_id: 'student-1',
            parent_name: 'Family Parent',
            student_name: 'Student One',
            created_at: '2026-08-30T12:00:00Z',
          },
          {
            id: 'activity-2',
            action: 'removed_consent',
            parent_id: 'parent-2',
            student_id: 'student-2',
            parent_name: 'Other Parent',
            student_name: 'Student Two',
            created_at: '2026-08-30T13:00:00Z',
          },
        ],
        totalCount: 2,
        currentPage: 1,
        totalPages: 1,
        limit: 20,
      },
      error: null,
    });
  });

  it('renders the student photo consent roster and summary', async () => {
    render(
      await PhotoConsentsPage({
        searchParams: Promise.resolve({}),
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Photo Consents' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Student One')).toHaveLength(2);
    expect(screen.getAllByText('Family Parent')).toHaveLength(2);
    expect(screen.getByText('Granted')).toBeInTheDocument();
    expect(screen.getByText('Not granted')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Photo Consent Activity Log' })
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Parent Name' })
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Student Name' })
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Date / Time' })
    ).toBeVisible();
    expect(screen.getByText('Consent')).toBeInTheDocument();
    expect(screen.getByText('Removed consent')).toBeInTheDocument();
  });

  it('does not expose roster data when authorization fails', async () => {
    mockGetPhotoConsentRoster.mockResolvedValue({
      data: null,
      error: 'Unauthorized',
    });

    render(
      await PhotoConsentsPage({
        searchParams: Promise.resolve({}),
      })
    );

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('Student One')).not.toBeInTheDocument();
  });
});
