import { test, expect, createTestUser, deleteTestUser } from '../fixtures';
import { LoginPage, NavigationComponent } from '../pages';

/**
 * Test: Sign out → /login
 * 
 * Corresponds to Gherkin Scenario: "Sign Out"
 * from tests/features/auth.feature
 * 
 * Given I am currently logged in
 * When I click the "Sign Out" button
 * Then my session should be invalidated
 * And I should be redirected to "/login"
 */

test.describe('Logout', () => {
  test('should redirect to /login after sign out', async ({ page }) => {
    // Create and login a user
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Now sign out using navigation
      const navigation = new NavigationComponent(page);
      await navigation.signOut();

      // Should be redirected to login
      await expect(async () => {
        const url = page.url();
        expect(url).toContain('/login');
      }).toPass({ timeout: 10000 });
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should invalidate session after logout', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Sign out
      const navigation = new NavigationComponent(page);
      await navigation.signOut();

      // Wait for redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

      // Try to navigate to protected page
      await page.goto('/parent');

      // Should be redirected back to login (session invalidated)
      await expect(async () => {
        const url = page.url();
        // Should either be on login or redirected there
        expect(url).toContain('/login');
      }).toPass({ timeout: 10000 });
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('sign out button should be accessible', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // User menu should be accessible
      const navigation = new NavigationComponent(page);
      await navigation.openUserMenu();

      // Sign out button should be visible
      await expect(navigation.signOutButton).toBeVisible();
    } finally {
      await deleteTestUser(user.userId);
    }
  });
});
