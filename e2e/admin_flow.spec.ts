import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

test.describe('Admin Dashboard Flows', () => {
    // Now using storage state from auth.setup.ts (seeded by global-setup.ts)
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should allow an admin to access user management', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await adminPage.navigateTo('/admin');

        // Admin should be able to access the admin dashboard
        await expect(page).toHaveURL(/\/admin/);
        await adminPage.goToUsers();
        await expect(page).toHaveURL(/\/admin\/users/);
        await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    });

    test('admin should access reports', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await adminPage.navigateTo('/admin/reports');
        // Use more specific selector to avoid strict mode violation
        await expect(page.getByRole('heading', { name: /analytics & reports/i })).toBeVisible();
    });

});
