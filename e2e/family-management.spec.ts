
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

        // Fill Form (react-hook-form spreads field props including name)
        await page.fill('input[name="firstName"]', firstName);
        await page.fill('input[name="lastName"]', lastName);
        await page.fill('input[name="email"]', email);
        // Note: no dob field is rendered in AddFamilyMemberDialog
        
        // Select Grade (shadcn Select component)
        const gradeTrigger = page.locator('button').filter({ hasText: 'Select grade' });
        await expect(gradeTrigger).toBeVisible();
        await gradeTrigger.click();
        await page.getByRole('option', { name: 'Elementary' }).click();
        
        await page.getByRole('button', { name: 'Add Member' }).click();

        // Verify Success — toast or list update
        await expect(page.getByText(firstName)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(email)).toBeVisible();
    });
});
