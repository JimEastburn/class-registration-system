
import { test, expect } from '@playwright/test';
import { createTestUser } from './utils/helpers';

test.describe('Family Management', () => {
    let parentUser: { email: string; userId: string; password: string };

    test.beforeAll(async () => {
        parentUser = await createTestUser('parent');
    });

    test('Parent can add a family member with email', async ({ page }) => {
        test.setTimeout(60000);

        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', parentUser.email);
        await page.fill('input[name="password"]', parentUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*parent/);

        // Navigate to Family
        await page.goto('/parent/family');
        await page.getByRole('button', { name: 'Add Family Member' }).click();

        const firstName = 'TestChild';
        const lastName = 'FamilyTest';
        const email = `testchild.${Date.now()}@test.com`;

        // Fill Form
        await page.fill('input[name="firstName"]', firstName);
        await page.fill('input[name="lastName"]', lastName);
        // This is the critical regression check - this field must exist
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="dob"]', '2016-01-01');
        
        // Select Grade (shadcn UI)
        const gradeTrigger = page.locator('button').filter({ hasText: 'Select grade' });
        await expect(gradeTrigger).toBeVisible();
        await gradeTrigger.click();
        await page.getByRole('option', { name: 'Elementary' }).click();
        
        await page.getByRole('button', { name: 'Add Member' }).click();

        // Verify Success
        // Wait for dialog to close or list to update
        await expect(page.getByText(firstName)).toBeVisible();
        await expect(page.getByText(email)).toBeVisible();
    });
});
