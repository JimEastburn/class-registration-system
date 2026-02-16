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
  // Run tests serially since they all create/destroy users and the
  // Supabase auth rate limits can cause flakiness when run in parallel.
  test.describe.configure({ mode: 'serial', retries: 1 });
  
  // Sign-out involves Supabase auth + Next.js middleware redirect chain
  test.setTimeout(60000);

  /**
   * Helper: Login and wait for dashboard to be fully ready
   */
  async function loginAndWaitForDashboard(page: import('@playwright/test').Page, email: string, password: string) {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);
    
    // Wait for redirect to dashboard  
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/parent/, { timeout: 30000 });
    
    // Give the page time to finish any compilation/hydration
    // This is necessary because the Next.js dev server may still be compiling
    await page.waitForTimeout(2000);
  }

  test('should redirect to /login after sign out', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      await loginAndWaitForDashboard(page, user.email, user.password);

      // Sign out
      const navigation = new NavigationComponent(page);
      await navigation.signOut();

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should invalidate session after logout', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      await loginAndWaitForDashboard(page, user.email, user.password);

      // Sign out
      const navigation = new NavigationComponent(page);
      await navigation.signOut();

      // Wait for redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 30000 });

      // Try to navigate to protected page
      await page.goto('/parent', { waitUntil: 'domcontentloaded' });

      // Should be redirected back to login (session invalidated)
      await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('sign out button should be accessible', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      await loginAndWaitForDashboard(page, user.email, user.password);

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
