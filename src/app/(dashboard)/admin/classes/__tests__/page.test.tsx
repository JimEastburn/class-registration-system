import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server dependencies before importing component
vi.mock('@/lib/actions/classes', () => ({
  getAllClasses: vi.fn().mockResolvedValue({
    success: true,
    data: { classes: [], total: 0 },
  }),
}));

vi.mock('@/lib/actions/scheduler', () => ({
  getConflictAlerts: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
}));

vi.mock('@/components/admin/AdminClassTable', () => ({
  __esModule: true,
  default: () => <div data-testid="admin-class-table" />,
}));

import AdminClassesPage from '../page';
import { getAllClasses } from '@/lib/actions/classes';

describe('AdminClassesPage', () => {
  beforeEach(() => {
    vi.mocked(getAllClasses).mockClear();
  });

  it('Create Class button links to /admin/classes/new, not /teacher/classes/new', async () => {
    const page = await AdminClassesPage({
      searchParams: Promise.resolve({}),
    });
    render(page);

    const createLink = screen.getByRole('link', { name: /create class/i });
    expect(createLink).toHaveAttribute('href', '/admin/classes/new');
    expect(createLink).not.toHaveAttribute('href', '/teacher/classes/new');
  });

  it('defaults to 20 rows per page when no limit is in the URL', async () => {
    await AdminClassesPage({ searchParams: Promise.resolve({}) });

    expect(getAllClasses).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });

  it('honors a supported limit from the URL', async () => {
    await AdminClassesPage({
      searchParams: Promise.resolve({ limit: '50' }),
    });

    expect(getAllClasses).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it.each(['999', '0', '-10', 'abc', ''])(
    'falls back to the default page size for unsupported limit "%s"',
    async (limit) => {
      await AdminClassesPage({ searchParams: Promise.resolve({ limit }) });

      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 })
      );
    }
  );

  describe('sorting', () => {
    it('passes the sort from the URL down to the query', async () => {
      await AdminClassesPage({
        searchParams: Promise.resolve({ sort: 'enrolled', dir: 'desc' }),
      });

      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { key: 'enrolled', direction: 'desc' },
        })
      );
    });

    it('defaults to ascending when the URL has no direction', async () => {
      await AdminClassesPage({
        searchParams: Promise.resolve({ sort: 'name' }),
      });

      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({ sort: { key: 'name', direction: 'asc' } })
      );
    });

    it('leaves the default ordering in place when no sort is requested', async () => {
      await AdminClassesPage({ searchParams: Promise.resolve({}) });

      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({ sort: undefined })
      );
    });

    it('ignores a sort column that does not exist', async () => {
      await AdminClassesPage({
        searchParams: Promise.resolve({ sort: 'nonsense', dir: 'desc' }),
      });

      expect(getAllClasses).toHaveBeenCalledWith(
        expect.objectContaining({ sort: undefined })
      );
    });
  });
});
