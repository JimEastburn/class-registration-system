
import { test, expect, createTestUser, deleteTestUser } from './fixtures';
import { LoginPage } from './pages';

test.describe('Teacher Class Management', () => {
    let teacherUser: { email: string; userId: string; password: string };

    test.beforeAll(async () => {
        teacherUser = await createTestUser('teacher');
    });

    test.afterAll(async () => {
        if (teacherUser) {
            await deleteTestUser(teacherUser.userId);
        }
    });

    test('Teacher can create and publish a class', async ({ page }) => {
        test.setTimeout(90000);

        // Login
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(teacherUser.email, teacherUser.password);
        await expect(page).toHaveURL(/.*teacher/, { timeout: 30000 });

        // Navigate to Create Class
        await page.goto('/teacher/classes/new', { waitUntil: 'domcontentloaded' });

        // Fill Class Details — labels must exactly match ClassForm.tsx FormLabels
        const className = `E2E Test Class ${Date.now()}`;
        await page.getByLabel('Class Name *').fill(className);
        await page.getByLabel('Description').fill('This is a test class created by E2E test.');
        await page.getByLabel('Capacity *').fill('15');
        await page.getByLabel('Price ($) *').fill('100');
        
        // Schedule — Select components use SelectTrigger with placeholder text
        // Select Day
        const dayTrigger = page.locator('button').filter({ hasText: 'Select a day' });
        await dayTrigger.click();
        await page.getByRole('option', { name: 'Tuesday only' }).click();

        // Select Block
        const blockTrigger = page.locator('button').filter({ hasText: 'Select a block' });
        await blockTrigger.click();
        await page.getByRole('option', { name: 'Block 1' }).click();

        // Submit
        await page.getByRole('button', { name: 'Create Class' }).click();

        // Should redirect to /teacher/classes/[id]
        await expect(page).toHaveURL(/\/teacher\/classes\/.+/, { timeout: 30000 });

        // Verify class page shows the name
        await expect(page.getByText(className)).toBeVisible();

        // Publish the class
        await page.getByRole('button', { name: 'Publish' }).click();

        // Verify published status
        await expect(page.getByText(/published/i)).toBeVisible({ timeout: 10000 });
    });

    test('Teacher sees validation errors when submitting empty form', async ({ page }) => {
        // Login
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(teacherUser.email, teacherUser.password);
        await expect(page).toHaveURL(/.*teacher/, { timeout: 30000 });

        // Navigate to Create Class
        await page.goto('/teacher/classes/new', { waitUntil: 'domcontentloaded' });

        // Clear pre-filled fields (capacity defaults to 10, price to 0)
        await page.getByLabel('Class Name *').fill('');

        // Submit empty form
        await page.getByRole('button', { name: 'Create Class' }).click();

        // Verify Validation Error Summary
        await expect(page.getByText('Please correct the following errors:')).toBeVisible();
        await expect(page.getByText('Name must be at least 3 characters')).toBeVisible();
        await expect(page.getByText('Please select a Day')).toBeVisible();
        await expect(page.getByText('Please select a Block of time')).toBeVisible();
    });
});
