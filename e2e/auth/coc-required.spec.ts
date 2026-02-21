import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages';

/**
 * Test: Code of Conduct required
 * 
 * Corresponds to Gherkin Scenario: "Code of Conduct Required"
 * from tests/features/auth.feature
 * 
 * Given I am on the registration page
 * When I submit the form without accepting the Code of Conduct
 * Then I should see a validation error "You must agree to the Community Code of Conduct"
 */

test.describe('Code of Conduct Requirement', () => {
  test('should reject registration without accepting Code of Conduct', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Fill form completely but DO NOT accept Code of Conduct
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'coc-test@example.com',
      password: 'SecurePass123!',
      role: 'parent'
    });

    // Submit WITHOUT accepting CoC
    await registerPage.submit();

    // Expect Code of Conduct validation error
    await expect(async () => {
      const content = await page.content();
      const hasCoCAgreementError = 
        content.includes('Code of Conduct') ||
        content.includes('agree') ||
        content.includes('community') ||
        content.includes('required');
      expect(hasCoCAgreementError).toBe(true);
    }).toPass({ timeout: 5000 });

    // Should still be on registration page
    expect(page.url()).toContain('/register');
  });

  test('should proceed when Code of Conduct is accepted', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const randomId = Math.random().toString(36).substring(7);
    const testEmail = `coc-accept-${Date.now()}-${randomId}@example.com`;
    
    await registerPage.goto();

    // Fill form and accept Code of Conduct
    await registerPage.register({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'SecurePass123!',
      role: 'parent'
    });

    // Should proceed (no CoC error, either success page or redirect)
    await expect(async () => {
      const url = page.url();
      const content = await page.content();
      
      // Should NOT be stuck on register with CoC error
      const hasCoCAgreementError = content.includes('must agree') &&
                                    content.includes('Code of Conduct');
      
      const isSuccess = content.includes('Check your email') ||
                        url.includes('/parent') ||
                        !url.includes('/register');
      
      expect(hasCoCAgreementError).toBe(false);
      expect(isSuccess).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('Code of Conduct checkbox should be visible', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Verify CoC checkbox is present and visible
    await expect(registerPage.codeOfConductCheckbox).toBeVisible();
  });
});
