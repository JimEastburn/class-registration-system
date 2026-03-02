import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

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

describe('AdminClassesPage', () => {
  it('Create Class button links to /admin/classes/new, not /teacher/classes/new', async () => {
    const page = await AdminClassesPage({
      searchParams: Promise.resolve({}),
    });
    render(page);

    const createLink = screen.getByRole('link', { name: /create class/i });
    expect(createLink).toHaveAttribute('href', '/admin/classes/new');
    expect(createLink).not.toHaveAttribute('href', '/teacher/classes/new');
  });
});
