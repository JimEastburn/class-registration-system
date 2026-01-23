import { test, expect } from '@playwright/test';

test.describe('Student Dashboard Flows', () => {
    // TODO: Student registration test is skipped because Radix UI Select
    // is not a native <select> and requires different interaction patterns.
    // Fix: Add data-testid to Select components and use proper Radix interaction.

    test.skip('should allow a student to register and view dashboard', async ({ page }) => {
        const studentEmail = `student-${Date.now()}@example.com`;
        const student = {
            email: studentEmail,
            password: 'Password123',
            firstName: 'Test',
            lastName: 'Student'
        };

        await page.goto('/register');
        await page.getByLabel(/first name/i).fill(student.firstName);
        await page.getByLabel(/last name/i).fill(student.lastName);
        await page.getByLabel(/email/i).fill(student.email);
        await page.getByLabel(/password/i).nth(0).fill(student.password);
        await page.getByLabel(/confirm password/i).fill(student.password);

        // This doesn't work because it's a Radix Select, not native
        await page.getByLabel(/role/i).selectOption('student');
        await page.getByRole('button', { name: /create account/i }).click();

        await expect(page).toHaveURL(/\/student/);
        await expect(page.getByText(`Welcome back, ${student.firstName}!`)).toBeVisible();
    });

    test.skip('student should see their schedule', async () => { });
    test.skip('student should see their classes', async () => { });
});
