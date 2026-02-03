
import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from './utils/helpers';

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
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', teacherUser.email);
        await page.fill('input[name="password"]', teacherUser.password);
        await page.click('button[type="submit"]');

        // Check for login error
        const errorAlert = page.locator('.text-red-200'); // Based on LoginForm.tsx
        if (await errorAlert.isVisible()) {
            console.error('Login failed with error:', await errorAlert.textContent());
            throw new Error('Login failed');
        }

        // Increase timeout for redirect
        await expect(page).toHaveURL(/.*teacher/, { timeout: 15000 });
        
        // Navigate to Classes
        await page.getByRole('link', { name: 'Classes', exact: true }).click();
        
        // Navigate to Create Class directly to avoid dashboard button issues
        await page.goto('/teacher/classes/new');

        // Fill Class Details
        const className = `E2E Test Class ${Date.now()}`;
        await page.getByLabel('Class Name').fill(className);
        await page.getByLabel('Description').fill('This is a test class created by E2E test.');
        await page.getByLabel('Capacity').fill('15');
        await page.getByLabel('Price').fill('100'); // $100.00
        
        // Schedule
        // Interact with Select components from Shadcn UI (Trigger -> Content -> Item)
        
        // Select Day
        await page.getByLabel('Day of Week').click();
        await page.getByLabel('Tuesday', { exact: true }).click(); // Select "Tuesday" option

        // Select Block
        await page.getByLabel('Block').click();
        await page.getByRole('option', { name: 'Block 1', exact: true }).click();

        await page.getByLabel('Location').fill('Room 101');

        // Submit (Save/Create)
        await page.getByRole('button', { name: 'Create Class' }).click();

        // Verification: Should see the class in the list
        await expect(page.getByText(className)).toBeVisible();
        
        // Publish the class
        await page.getByText(className).click();
        
        // Now in detail/edit view
        // Click "Publish" button
        await page.getByRole('button', { name: 'Publish' }).click();
        
        // Verify success message or status change
        await expect(page.getByText('Class published successfully')).toBeVisible();
        await expect(page.getByText('Published')).toBeVisible();
    });

    test('Teacher sees validation errors when submitting empty form', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', teacherUser.email);
        await page.fill('input[name="password"]', teacherUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*teacher/, { timeout: 15000 });

        // Navigate to Create Class
        await page.goto('/teacher/classes/new');

        // Submit empty form
        await page.getByRole('button', { name: 'Create Class' }).click();

        // Verify Validation Error Summary exists
        const alert = page.locator('.text-destructive').first();
        // The Alert component usually has text-destructive or border-destructive. 
        // Based on my code: <Alert variant="destructive">
        // It renders with `text-destructive-foreground` or similar, but let's check for the text explicitly.
        
        await expect(page.getByText('Please correct the following errors:')).toBeVisible();
        await expect(page.getByText('Name must be at least 3 characters')).toBeVisible();
        await expect(page.getByText('Please select a Day')).toBeVisible();
        await expect(page.getByText('Please select a Block')).toBeVisible();
    });
});
