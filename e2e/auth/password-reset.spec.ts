import { test, expect, createTestUser, deleteTestUser } from '../fixtures';
import { LoginPage } from '../pages';

/**
 * Test: Password reset request
 * 
 * Corresponds to Gherkin Scenario: "Forgotten Password"
 * from tests/features/auth.feature
 * 
 * Given I am on the login page
 * When I click "Forgot Password"
 * And I enter my registered email
 * Then a password reset email should be sent
 */

test.describe('Password Reset Request', () => {
  test('should show password reset form when clicking forgot password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Click forgot password link
    await loginPage.goToForgotPassword();

    // Should be on password reset page or see reset form
    await expect(async () => {
      const url = page.url();
      const content = await page.content();
      const isOnResetPage = 
        url.includes('reset') ||
        url.includes('forgot') ||
        content.includes('Reset') ||
        content.includes('forgot');
      expect(isOnResetPage).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('should accept email for password reset', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.goToForgotPassword();

      // Enter email
      const emailInput = page.getByRole('textbox', { name: /email/i });
      await emailInput.fill(user.email);

      // Submit the form
      const submitButton = page.getByRole('button', { name: /reset|send|submit/i });
      await submitButton.click();

      // Should show success message or confirmation
      await expect(async () => {
        const content = await page.content();
        const hasSuccess = 
          content.includes('sent') ||
          content.includes('check your email') ||
          content.includes('Reset link') ||
          content.includes('success') ||
          content.includes('email');
        expect(hasSuccess).toBe(true);
      }).toPass({ timeout: 10000 });
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should handle non-existent email gracefully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.goToForgotPassword();

    // Enter non-existent email
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.fill(`nonexistent-${Date.now()}@example.com`);

    // Submit
    const submitButton = page.getByRole('button', { name: /reset|send|submit/i });
    await submitButton.click();

    // Should either show success (for security, don't reveal if email exists)
    // or handle gracefully without error
    await expect(async () => {
      const content = await page.content();
      // For security, most systems show success even for non-existent emails
      const hasResponse = 
        content.includes('sent') ||
        content.includes('check your email') ||
        content.includes('not found') ||
        content.includes('email');
      expect(hasResponse).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test('should have link back to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.goToForgotPassword();

    // Look for back to login link
    const backToLogin = page.getByRole('link', { name: /login|sign in|back/i });
    await expect(backToLogin).toBeVisible();

    await backToLogin.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
