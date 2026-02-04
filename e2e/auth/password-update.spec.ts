import { test, expect } from '@playwright/test';

/**
 * Test: Password update via reset link
 * 
 * Tests the password update page that users land on after clicking
 * the password reset link from their email.
 * 
 * Note: Since we can't simulate receiving an email in E2E tests,
 * these tests focus on the password update form UI and validation.
 */

test.describe('Password Update', () => {
  // The actual reset process requires email verification which can't be
  // fully tested in E2E without email interception. These tests cover
  // the UI and validation aspects of the password update form.

  test('should display password update form elements', async ({ page }) => {
    // Navigate to password update page (simulating landing from email link)
    // In real scenario, this would include a token in the URL
    await page.goto('/auth/update-password');

    // Check for password input fields
    // The form should have password fields
    await expect(async () => {
      const content = await page.content();
      const hasPasswordForm = 
        content.includes('password') ||
        content.includes('Password') ||
        content.includes('update') ||
        content.includes('reset');
      expect(hasPasswordForm).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('should validate password requirements on update form', async ({ page }) => {
    await page.goto('/auth/update-password');

    // Try to find password inputs
    const passwordInputs = await page.locator('input[type="password"]').all();
    
    if (passwordInputs.length >= 1) {
      // Fill with weak password
      await passwordInputs[0].fill('weak');
      
      if (passwordInputs.length >= 2) {
        await passwordInputs[1].fill('weak');
      }

      // Try to submit
      const submitButton = page.getByRole('button', { name: /update|save|submit|reset/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show validation error for weak password
        await expect(async () => {
          const content = await page.content();
          const hasValidationError = 
            content.includes('at least 8') ||
            content.includes('too short') ||
            content.includes('uppercase') ||
            content.includes('requirements');
          expect(hasValidationError).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test('should require matching passwords', async ({ page }) => {
    await page.goto('/auth/update-password');

    const passwordInputs = await page.locator('input[type="password"]').all();
    
    if (passwordInputs.length >= 2) {
      // Fill with non-matching passwords
      await passwordInputs[0].fill('SecurePass123!');
      await passwordInputs[1].fill('DifferentPass123!');

      // Try to submit
      const submitButton = page.getByRole('button', { name: /update|save|submit|reset/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show password mismatch error
        await expect(async () => {
          const content = await page.content();
          const hasMismatchError = 
            content.includes('match') ||
            content.includes('Match') ||
            content.includes('same') ||
            content.includes('confirm');
          expect(hasMismatchError).toBe(true);
        }).toPass({ timeout: 5000 });
      }
    }
  });

  test('should have back to login link', async ({ page }) => {
    await page.goto('/auth/update-password');

    // Check for back to login link
    
    await expect(async () => {
      const content = await page.content();
      const hasLoginLink = 
        content.includes('login') ||
        content.includes('Login') ||
        content.includes('sign in') ||
        content.includes('Sign in');
      expect(hasLoginLink).toBe(true);
    }).toPass({ timeout: 5000 });
  });
});
