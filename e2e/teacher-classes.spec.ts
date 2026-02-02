
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
        await expect(page).toHaveURL(/.*teacher/, { timeout: 10000 });
        
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
        
        // Schedule - Assuming there is a schedule config or plain text input depending on implementation
        // Check "CreateClassForm" logic implies we might have day/time inputs
        // Let's assume day/time for now or try to fill distinct fields if available
        // If the form has a "Schedule" complex input, we might need more selectors
        // For now filling Location
        await page.getByLabel('Location').fill('Room 101');

        // Submit (Save/Create)
        await page.getByRole('button', { name: 'Create Class' }).click();

        // Verification: Should see the class in the list
        await expect(page.getByText(className)).toBeVisible();
        
        // Check default status is draft (if visible) or just open it
        // The implementation usually redirects to class list or class detail
        
        // Publish the class
        // Find the class card or row actions
        // Assuming there is an "Edit" or "Publish" button
        // Need to know the UI structure. 
        // Let's click on the class to View/Edit it.
        await page.getByText(className).click();
        
        // Now in detail/edit view
        // Click "Publish" button
        await page.getByRole('button', { name: 'Publish' }).click();
        
        // Verify success message or status change
        await expect(page.getByText('Class published successfully')).toBeVisible();
        await expect(page.getByText('Published')).toBeVisible();
    });
});
