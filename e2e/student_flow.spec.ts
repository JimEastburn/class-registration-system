import { test, expect } from '@playwright/test';

test.describe('Student Dashboard Flows', () => {
    test('should allow a student to register and view dashboard', async ({ page }) => {
        // Use unique email without + to avoid potential validation issues
        const timestamp = Date.now();
        const studentEmail = `test.student.${timestamp}@gmail.com`;

        const student = {
            email: studentEmail,
            password: 'Password123',
            firstName: 'Test',
            lastName: 'Student'
        };


        await page.goto('/register');

        // Fill form fields
        await page.getByLabel(/first name/i).fill(student.firstName);
        await page.getByLabel(/last name/i).fill(student.lastName);
        await page.getByLabel(/email/i).fill(student.email);

        // Handle Radix Select - click trigger, then click option
        await page.getByTestId('role-select-trigger').click();
        await page.getByTestId('role-option-student').click();

        // Fill password fields (use nth for multiple password fields)
        await page.locator('input[type="password"]').first().fill(student.password);
        await page.locator('input[type="password"]').last().fill(student.password);

        // Submit
        await page.getByRole('button', { name: /create account/i }).click();

        // Registration shows "Check Your Email" confirmation page
        await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({ timeout: 10000 });
    });

    test('student should see their schedule', async ({ page }) => {
        // Use the pre-seeded student from global-setup
        await page.goto('/login');
        await page.getByTestId('email-input').fill('student@example.com');
        await page.getByTestId('password-input').fill('Password123');
        await page.getByTestId('login-submit-button').click();

        await expect(page).toHaveURL(/\/student/);

        // Navigate to schedule
        await page.getByTestId('nav-link-my-schedule').click();
        await expect(page).toHaveURL(/\/student\/schedule/);
        await expect(page.getByRole('heading', { name: /schedule/i })).toBeVisible();
    });

    test('student should see their classes', async ({ page }) => {
        // Use the pre-seeded student from global-setup
        await page.goto('/login');
        await page.getByTestId('email-input').fill('student@example.com');
        await page.getByTestId('password-input').fill('Password123');
        await page.getByTestId('login-submit-button').click();

        await expect(page).toHaveURL(/\/student/);

        // Navigate to classes
        await page.getByTestId('nav-link-my-classes').click();
        await expect(page).toHaveURL(/\/student\/classes/);
        // Use specific heading instead of broad regex
        await expect(page.getByRole('heading', { name: 'My Classes' })).toBeVisible();
    });
});
