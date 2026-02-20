import { test, expect, createTestUser, deleteTestUser } from '../fixtures';
import { LoginPage } from '../pages';

/**
 * Test: Wrong password rejected
 * 
 * Tests that login fails with an incorrect password
 * and appropriate error message is displayed.
 */

test.describe('Login Failure', () => {
  test('should reject login with wrong password', async ({ page }) => {
    // Create a valid user to attempt login
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Attempt login with wrong password
      await loginPage.login(user.email, 'WrongPassword123!');

      // Should show error message via data-testid
      await expect(page.getByTestId('login-error-message')).toBeVisible({ timeout: 10000 });

      // Should still be on login page
      expect(page.url()).toContain('/login');
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should reject login with non-existent email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with non-existent email
    const fakeEmail = `nonexistent-${Date.now()}@example.com`;
    await loginPage.login(fakeEmail, 'Password123!');

    // Should show error message via data-testid
    await expect(page.getByTestId('login-error-message')).toBeVisible({ timeout: 10000 });

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });

  test('should not redirect after failed login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.goto();
    await loginPage.login('fake@example.com', 'WrongPass123!');

    // Wait a bit to ensure no redirect happens
    await page.waitForTimeout(2000);

    // Should still be on login page, not redirected
    expect(page.url()).toContain('/login');
    expect(page.url()).not.toContain('/parent');
    expect(page.url()).not.toContain('/teacher');
    expect(page.url()).not.toContain('/admin');
  });
});
