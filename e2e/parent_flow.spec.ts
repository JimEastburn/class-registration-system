import { test, expect } from '@playwright/test';
import { ParentPage } from './pages/ParentPage';

test.describe('Parent Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/parent.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/parent');
    });

    test('should display correct dashboard stats', async ({ page }) => {
        // Welcome message
        await expect(page.getByText(/welcome back, john/i)).toBeVisible();

        // Verify stats cards
        // Family Members count (Jane, Jack, Test Student)
        await expect(page.locator('div').filter({ hasText: /^3$/ }).first()).toBeVisible();
        // Use a more specific locator for the card title to avoid nav link conflict
        await expect(page.getByRole('main').getByText('Family Members')).toBeVisible();

        // Active Enrollments (Jane, Jack, and Test Student are all enrolled)
        await expect(page.locator('div').filter({ hasText: /^3$/ }).nth(1)).toBeVisible();
        await expect(page.getByRole('main').getByText('Active Enrollments')).toBeVisible();
    });

    test('should view family members and management options', async ({ page }) => {
        const parentPage = new ParentPage(page);
        await parentPage.goToFamilyMembers();

        await expect(page).toHaveURL(/\/parent\/family/);
        await expect(page.getByText('Jane Doe')).toBeVisible();
        await expect(page.getByText('Jack Doe')).toBeVisible();
        await expect(page.getByText('Test Student')).toBeVisible();

        // Verify "Add Family Member" button is visible
        await expect(page.getByRole('button', { name: /add family member/i })).toBeVisible();
    });

    test('should see enrollment list', async ({ page }) => {
        const parentPage = new ParentPage(page);
        await parentPage.goToEnrollments();

        await expect(page).toHaveURL(/\/parent\/enrollments/);

        // Verify multiple students are enrolled
        // Jane and Test Student in "Advanced Python for AI"
        // Jack in "Creative Writing"
        await expect(page.getByText('Advanced Python for AI').first()).toBeVisible();
        await expect(page.getByText('Creative Writing')).toBeVisible();
        await expect(page.getByText('Test Student')).toBeVisible();
        await expect(page.getByText('Jane Doe')).toBeVisible();
        await expect(page.getByText('Jack Doe')).toBeVisible();

        // Status check (confirmed/paid)
        await expect(page.getByText('confirmed', { exact: false }).first()).toBeVisible();
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

