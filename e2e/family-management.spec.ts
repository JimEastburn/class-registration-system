
import { test, expect, createTestUser, deleteTestUser } from './fixtures';
import { LoginPage } from './pages';

test.describe('Family Management', () => {
    let parentUser: { email: string; userId: string; password: string };

    test.beforeAll(async () => {
        parentUser = await createTestUser('parent');
    });

    test.afterAll(async () => {
        if (parentUser) {
            await deleteTestUser(parentUser.userId);
        }
    });

    test('Parent can add a family member with email', async ({ page }) => {
        test.setTimeout(60000);

        // Login
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(parentUser.email, parentUser.password);
        await expect(page).toHaveURL(/.*parent/, { timeout: 15000 });

        // Navigate to Family
        await page.goto('/parent/family', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Add Family Member' }).click();

        const firstName = 'TestChild';
        const lastName = 'FamilyTest';
        const email = `testchild.${Date.now()}@test.com`;

        // Fill Form using data-testid selectors
        await page.getByTestId('family-first-name-input').fill(firstName);
        await page.getByTestId('family-last-name-input').fill(lastName);
        await page.getByTestId('family-email-input').fill(email);
        
        // Select Grade using data-testid
        await page.getByTestId('family-grade-select').click();
        await page.getByRole('option', { name: 'Elementary' }).click();
        
        await page.getByTestId('family-submit-button').click();

        // Verify Success — toast or list update
        await expect(page.getByText(firstName)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(email)).toBeVisible();
    });
});
