import { test, expect } from '../fixtures';
import { LoginPage } from '../pages';

/**
 * Test: Sign in (Parent) → /parent
 * 
 * Corresponds to Gherkin Scenario: "Functionally Correct Sign In (Parent)"
 * from tests/features/auth.feature
 * 
 * Given I have a registered account with role "parent"
 * When I submit the login form with valid credentials
 * Then I should be successfully authenticated
 * And I should be redirected to "/parent"
 */

test.describe('Parent Login', () => {
  test('should redirect parent to /parent after login', async ({ testUser, page }) => {
    // testUser fixture creates a parent user automatically
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);

    // Wait for page to load after login redirect
    await page.waitForLoadState('domcontentloaded');

    // Verify we're on the parent dashboard
    await expect(page).toHaveURL(/\/parent/, { timeout: 30000 });
  });

  test('should display login form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should have link to registration page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.goToSignUp();
    await expect(page).toHaveURL('/register');
  });
});
