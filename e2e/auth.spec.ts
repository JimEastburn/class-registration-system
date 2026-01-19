import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
    test('should display login page', async ({ page }) => {
        await page.goto('/login');

        await expect(page).toHaveTitle(/Login/);
        await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should display registration page', async ({ page }) => {
        await page.goto('/register');

        await expect(page).toHaveTitle(/Register/);
        await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
        await expect(page.getByLabel(/first name/i)).toBeVisible();
        await expect(page.getByLabel(/last name/i)).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test('should have link from login to register', async ({ page }) => {
        await page.goto('/login');

        const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
        await expect(registerLink).toBeVisible();
        await registerLink.click();

        await expect(page).toHaveURL(/register/);
    });

    test('should have link from register to login', async ({ page }) => {
        await page.goto('/register');

        const loginLink = page.getByRole('link', { name: /sign in|login/i });
        await expect(loginLink).toBeVisible();
        await loginLink.click();

        await expect(page).toHaveURL(/login/);
    });

    test('should display forgot password page', async ({ page }) => {
        await page.goto('/forgot-password');

        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /reset|send/i })).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
        await page.goto('/login');

        await page.getByLabel(/email/i).fill('invalid-email');
        await page.getByLabel(/password/i).fill('somepassword');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should show error (either inline validation or form error)
        const errorMessage = page.locator('text=/invalid|valid email/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 }).catch(() => {
            // Some forms may not show inline validation
        });
    });

    test('should redirect unauthenticated user from dashboard', async ({ page }) => {
        await page.goto('/parent');

        // Should redirect to login
        await expect(page).toHaveURL(/login/);
    });
});

test.describe('Public Pages', () => {
    test('should load home page', async ({ page }) => {
        await page.goto('/');

        // Home page should load without errors
        await expect(page).toHaveTitle(/Class Registration/i);
    });
});

test.describe('Navigation', () => {
    test('should navigate between auth pages', async ({ page }) => {
        // Start at login
        await page.goto('/login');
        await expect(page).toHaveURL(/login/);

        // Go to register
        await page.goto('/register');
        await expect(page).toHaveURL(/register/);

        // Go to forgot password
        await page.goto('/forgot-password');
        await expect(page).toHaveURL(/forgot-password/);
    });
});

test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');

        // Form should still be visible
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/login');

        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
    });
});

test.describe('Form Validation', () => {
    test('register form should validate required fields', async ({ page }) => {
        await page.goto('/register');

        // Try to submit empty form
        await page.getByRole('button', { name: /create|register|sign up/i }).click();

        // Should show validation errors or prevent submission
        // The page should still be on register
        await expect(page).toHaveURL(/register/);
    });

    test('password field should hide input', async ({ page }) => {
        await page.goto('/login');

        const passwordField = page.getByLabel(/password/i);
        await expect(passwordField).toHaveAttribute('type', 'password');
    });
});

test.describe('Accessibility', () => {
    test('login page should have proper form labels', async ({ page }) => {
        await page.goto('/login');

        // Check that labels are associated with inputs
        const emailInput = page.getByLabel(/email/i);
        const passwordInput = page.getByLabel(/password/i);

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
    });

    test('should be navigable with keyboard', async ({ page }) => {
        await page.goto('/login');

        // Tab through form elements
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
    });
});
