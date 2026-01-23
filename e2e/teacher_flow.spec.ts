import { test, expect } from '@playwright/test';
import { TeacherPage } from './pages/TeacherPage';

test.describe('Teacher Dashboard Flows', () => {
    test.use({ storageState: 'playwright/.auth/teacher.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/teacher');
    });

    test('should display correct dashboard stats', async ({ page }) => {
        // Welcome message
        await expect(page.getByText(/welcome back, alice/i)).toBeVisible();

        // Verify stats cards
        // Active Classes (Advanced Python and Chess Masterclass)
        await expect(page.locator('div').filter({ hasText: /^2$/ }).first()).toBeVisible();
        await expect(page.getByRole('main').getByText('Active Classes')).toBeVisible();

        // Total Students (Jane and Test Student)
        await expect(page.locator('div').filter({ hasText: /^2$/ }).first()).toBeVisible();
        await expect(page.getByRole('main').getByText('Total Students')).toBeVisible();
    });

    test('should view assigned classes and details', async ({ page }) => {
        const teacherPage = new TeacherPage(page);
        await teacherPage.goToClasses();

        await expect(page).toHaveURL(/\/teacher\/classes/);
        await expect(page.getByText('Advanced Python for AI')).toBeVisible();
        await expect(page.getByText('Chess Masterclass')).toBeVisible();

        // Verify some details in the list
        await expect(page.getByText('Room 302')).toBeVisible();
        await expect(page.getByText('Student Lounge')).toBeVisible();
        await expect(page.getByText('active').first()).toBeVisible();
    });

    test('should view students in a specific class', async ({ page }) => {
        await page.goto('/teacher/classes');

        // Click the "View Students" button for the "Advanced Python for AI" class
        await page.getByRole('button', { name: /view students/i }).first().click();

        // Should navigate to the students page
        await expect(page).toHaveURL(/\/teacher\/classes\/[a-zA-Z0-9-]+\/students/);

        // Verify that "Test Student" is visible in the list
        await expect(page.getByRole('heading', { name: /students in/i })).toBeVisible();
        await expect(page.getByText('Test Student')).toBeVisible();
    });

    test('should view all enrolled students', async ({ page }) => {
        const teacherPage = new TeacherPage(page);
        await teacherPage.goToStudents();

        await expect(page).toHaveURL(/\/teacher\/students/);
        await expect(page.getByText('Combined Enrollment List')).toBeVisible();

        // Both Jane Doe and Test Student should be in the combined list
        await expect(page.getByText('Jane Doe')).toBeVisible();
        await expect(page.getByText('Test Student')).toBeVisible();
        await expect(page.getByText('Advanced Python for AI').first()).toBeVisible();
    });
});

