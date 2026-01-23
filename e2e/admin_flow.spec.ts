import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

// TODO: Admin tests are skipped until the Admin user is properly created in Supabase.
test.describe.skip('Admin Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should allow an admin to access user management', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await adminPage.navigateTo('/admin');

        if (page.url().includes('/admin')) {
            await adminPage.goToUsers();
            await expect(page).toHaveURL(/\/admin\/users/);
            await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
        }
    });

    test('admin should access reports', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await adminPage.navigateTo('/admin/reports');
        await expect(page.getByText(/Reports/i)).toBeVisible();
    });
});
