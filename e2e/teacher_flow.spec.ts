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

    test('should view students in a class', async ({ page }) => {
        await page.goto('/teacher/classes');

        // Click the "View Students" button for the "Advanced Python for AI" class
        await page.getByRole('button', { name: /view students/i }).first().click();

        // Should navigate to the students page
        await expect(page).toHaveURL(/\/teacher\/classes\/[a-zA-Z0-9-]+\/students/);

        // Verify that "Test Student" is visible in the list
        await expect(page.getByRole('heading', { name: /students in/i })).toBeVisible();
        await expect(page.getByText('Test Student')).toBeVisible();
    });
});
