import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages';

/**
 * Test: Sign up (Parent) with all fields
 * 
 * Corresponds to Gherkin Scenario: "Successful Sign Up (Parent)"
 * from tests/features/auth.feature
 * 
 * Given I am on the registration page
 * When I submit the registration form with all required fields
 * Then a new user account should be created
 * And I should be redirected to the email confirmation page or dashboard
 */

test.describe('Parent Sign Up', () => {
  const generateEmail = () => {
    const randomId = Math.random().toString(36).substring(7);
    const timestamp = Date.now();
    return `parent-signup-${timestamp}-${randomId}@example.com`;
  };

  test('should successfully register as a parent with all fields', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const testEmail = generateEmail();
    const password = 'SecurePass123!';

    // Navigate to registration page
    await registerPage.goto();
    await expect(page).toHaveURL('/register');

    // Fill registration form with all required fields
    await registerPage.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: testEmail,
      phone: '555-0100',
      password: password,
      role: 'parent'
    });

    // Verify successful registration
    // Registration can result in:
    // 1. Email confirmation page with success message
    // 2. Auto-login redirect to /parent dashboard
    await expect(async () => {
      const url = page.url();
      const content = await page.content();
      
      const isOnConfirmation = content.includes('registration is complete') ||
                               content.includes('verify your email') ||
                               content.includes('confirmation');
      const isOnDashboard = url.includes('/parent');
      
      expect(isOnConfirmation || isOnDashboard).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('should display required fields on registration form', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Verify all required form elements are present
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.roleSelectTrigger).toBeVisible();
    await expect(registerPage.codeOfConductCheckbox).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('should have link to sign in page', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Click sign in link
    await registerPage.goToSignIn();
    
    // Verify navigation to login
    await expect(page).toHaveURL('/login');
  });

  test('should be able to select parent role', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Click role selector
    await registerPage.roleSelectTrigger.click();

    // Verify parent option is available
    const parentOption = page.getByTestId('role-option-parent');
    await expect(parentOption).toBeVisible();

    // Select parent role
    await parentOption.click();
  });
});
