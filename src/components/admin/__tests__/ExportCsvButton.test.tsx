import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportCsvButton } from '../ExportCsvButton';

const fetchMock = vi.fn();

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

describe('ExportCsvButton', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response('csv', {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="users_matching.csv"',
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    window.URL.createObjectURL = vi.fn(() => 'blob:export');
    window.URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it('offers matching and all choices when filters are active', async () => {
    const user = userEvent.setup();
    render(
      <ExportCsvButton
        type="users"
        currentParams="search=Jordan&page=3"
        matchingCount={4}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(
      screen.getByRole('menuitem', { name: 'Export 4 matching users' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Export all users' })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('menuitem', { name: 'Export 4 matching users' })
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/export?type=users&scope=matching&search=Jordan',
        { cache: 'no-store' }
      )
    );
  });

  it('downloads all records directly when no filters are active', async () => {
    const user = userEvent.setup();
    render(
      <ExportCsvButton
        type="classes"
        currentParams="page=2&limit=50"
        matchingCount={20}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Export all classes' })
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/export?type=classes&scope=all',
        { cache: 'no-store' }
      )
    );
  });
});
