import { test, expect } from '@playwright/test';
import { ParentPage } from './pages/ParentPage';

test.describe('Parent Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/parent.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/parent');
    });

    test('should view family members', async ({ page }) => {
        const parentPage = new ParentPage(page);
        await parentPage.goToFamilyMembers();

        await expect(page).toHaveURL(/\/parent\/family/);
        await expect(page.getByText('Jane Doe')).toBeVisible();
        await expect(page.getByText('Jack Doe')).toBeVisible();
    });

    test('should browse classes', async ({ page }) => {
        const parentPage = new ParentPage(page);
        await parentPage.goToBrowseClasses();

        await expect(page).toHaveURL(/\/parent\/classes/);
        await expect(page.getByText('Advanced Python for AI')).toBeVisible();
        await expect(page.getByText('Creative Writing')).toBeVisible();
    });

    test('should navigate to class details', async ({ page }) => {
        await page.goto('/parent/classes');

        // Click the "View Details & Enroll" button
        await page.getByRole('button', { name: /view details & enroll/i }).first().click();

        await expect(page).toHaveURL(/\/parent\/classes\/[a-zA-Z0-9-]+/);
        // Wait for page content to load
        await expect(page.locator('main')).toBeVisible();
    });
});
