
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

        // Fill Class Details using data-testid selectors
        const className = `E2E Test Class ${Date.now()}`;
        await page.getByTestId('class-name-input').fill(className);
        await page.getByTestId('class-description-input').fill('This is a test class created by E2E test.');
        await page.getByTestId('class-capacity-input').fill('15');

        // Submit
        await page.getByTestId('class-submit-button').click();

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

        // Clear pre-filled fields (capacity defaults to 10)
        await page.getByTestId('class-name-input').fill('');

        // Submit empty form
        await page.getByTestId('class-submit-button').click();

        // Verify Validation Error Summary via data-testid
        const errorSummary = page.getByTestId('class-form-error-summary');
        await expect(errorSummary).toBeVisible();
        
        // Check error messages within the error summary to avoid strict mode violations
        await expect(errorSummary.getByText('Name must be at least 3 characters')).toBeVisible();
    });
});
