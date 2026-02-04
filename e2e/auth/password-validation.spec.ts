import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages';

/**
 * Test: Weak password rejected
 * 
 * Corresponds to Gherkin Scenario: "Registration Password Validation"
 * from tests/features/auth.feature
 * 
 * Given I am on the registration page
 * When I submit the registration form with an invalid password "weak"
 * Then I should see validation errors
 */

test.describe('Password Validation', () => {
  test('should reject weak password - too short', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with weak password (too short)
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'weak',
      role: 'parent'
    });

    // Accept code of conduct
    await registerPage.acceptCodeOfConduct();

    // Submit
    await registerPage.submit();

    // Expect password validation error
    await expect(async () => {
      const content = await page.content();
      const hasLengthError = content.includes('at least 8 characters') ||
                             content.includes('too short') ||
                             content.includes('minimum');
      expect(hasLengthError).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('should reject password without uppercase letter', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with password missing uppercase
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123!',
      role: 'parent'
    });

    await registerPage.acceptCodeOfConduct();
    await registerPage.submit();

    // Expect uppercase validation error
    await expect(async () => {
      const content = await page.content();
      const hasUppercaseError = content.includes('uppercase') ||
                                content.includes('capital letter');
      expect(hasUppercaseError).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('should reject password without number', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form with password missing number
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password!',
      role: 'parent'
    });

    await registerPage.acceptCodeOfConduct();
    await registerPage.submit();

    // Expect number validation error
    await expect(async () => {
      const content = await page.content();
      const hasNumberError = content.includes('number') ||
                             content.includes('digit');
      expect(hasNumberError).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  test('should accept valid strong password', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const randomId = Math.random().toString(36).substring(7);
    const testEmail = `password-test-${Date.now()}-${randomId}@example.com`;
    
    await registerPage.goto();

    // Fill form with valid strong password
    await registerPage.register({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'SecurePass123!',
      role: 'parent'
    });

    // Should proceed to success (no password validation errors)
    await expect(async () => {
      const url = page.url();
      const content = await page.content();
      
      // Should NOT show password validation errors
      const hasPasswordError = content.includes('at least 8 characters') ||
                               content.includes('uppercase') ||
                               content.includes('must contain');
      
      // Should either show success or redirect
      const isSuccess = content.includes('registration is complete') ||
                        url.includes('/parent');
      
      expect(hasPasswordError).toBe(false);
      expect(isSuccess || !page.url().includes('/register')).toBe(true);
    }).toPass({ timeout: 15000 });
  });
});
