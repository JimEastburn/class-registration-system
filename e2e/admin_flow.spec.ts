import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

test.describe('Admin Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should display correct dashboard stats', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL(/\/admin/);

        // Header verification
        await expect(page.getByText('Admin Portal')).toBeVisible();
        await expect(page.getByText('Admin Dashboard')).toBeVisible();

        // Stats Cards - using .first() to handle any potential DOM duplicates
        await expect(page.getByTestId('stat-card-users').first()).toBeVisible();
        await expect(page.getByTestId('stat-card-classes').first()).toBeVisible();
        await expect(page.getByTestId('stat-card-enrollments').first()).toBeVisible();
        await expect(page.getByTestId('stat-card-payments').first()).toBeVisible();

        // Verify titles within cards
        await expect(page.getByTestId('stat-card-users').first().getByText('Total Users')).toBeVisible();
    });

    test('should show recent enrollment activity section', async ({ page }) => {
        await page.goto('/admin');

        const activityCard = page.getByTestId('recent-enrollments-card').first();
        await expect(activityCard).toBeVisible();
        await expect(activityCard.getByText('Recent Enrollments')).toBeVisible();

        // Check for either the list or the empty state message
        const noActivity = page.getByTestId('no-activity-message').first();
        const activityList = page.getByTestId('recent-enrollments-list').first();

        await expect(noActivity.or(activityList)).toBeVisible();
    });

    test('should allow an admin to access management areas', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await page.goto('/admin');

        // Navigating and verifying headings - all using POM
        const areas = [
            { method: () => adminPage.goToUsers(), url: /\/admin\/users/, heading: /user management/i },
            { method: () => adminPage.goToClasses(), url: /\/admin\/classes/, heading: /class management/i },
            { method: () => adminPage.goToEnrollments(), url: /\/admin\/enrollments/, heading: /enrollment management/i },
            { method: () => adminPage.goToPayments(), url: /\/admin\/payments/, heading: /payment management/i },
        ];

        for (const area of areas) {
            await area.method();
            await expect(page).toHaveURL(area.url);
            await expect(page.getByRole('heading', { name: area.heading })).toBeVisible();
        }
    });

    test('admin should access reports', async ({ page }) => {
        const adminPage = new AdminPage(page);
        await adminPage.navigateTo('/admin/reports');
        await expect(page.getByRole('heading', { name: /analytics & reports/i })).toBeVisible();
    });
});
