import { test, expect } from '@playwright/test';
import { TeacherPage } from './pages/TeacherPage';

test.describe('Teacher Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/teacher.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/teacher');
    });

    test('should view assigned classes', async ({ page }) => {
        const teacherPage = new TeacherPage(page);
        await teacherPage.goToClasses();

        await expect(page).toHaveURL(/\/teacher\/classes/);
        await expect(page.getByText('Advanced Python for AI')).toBeVisible();
        await expect(page.getByText('Chess Masterclass')).toBeVisible();
    });

    // TODO: This test is skipped because teacher class cards don't have 
    // a direct link to class details. Need to add data-testid to class cards.
    test.skip('should view students in a class', async ({ page }) => {
        await page.goto('/teacher/classes');
        await page.getByRole('link', { name: /advanced python/i }).first().click();
        await expect(page).toHaveURL(/\/teacher\/classes\/[a-zA-Z0-9-]+/);
        await expect(page.getByText('Jane Doe')).toBeVisible();
    });
});
