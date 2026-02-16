import { test, expect, createTestUser, deleteTestUser } from '../fixtures';
import { LoginPage } from '../pages';

/**
 * Test: Session persists on refresh
 * 
 * Verifies that authenticated sessions survive page refreshes
 * and navigation, maintaining the user's login state.
 */

test.describe('Session Persistence', () => {
  test('should maintain session after page refresh', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Wait for page to fully load (ensures auth cookies are set)
      await page.waitForLoadState('domcontentloaded');

      // Refresh the page
      await page.reload({ waitUntil: 'domcontentloaded' });

      // Should still be on parent dashboard (session persisted)
      // Allow time for middleware to verify session and potentially redirect
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Should NOT be redirected to login
      expect(page.url()).not.toContain('/login');
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should maintain session when navigating between pages', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });
      await page.waitForLoadState('domcontentloaded');

      // Navigate to a different protected page
      await page.goto('/parent/family', { waitUntil: 'domcontentloaded' });

      // Should be able to access the page (session persisted)
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Should NOT be redirected to login
      expect(page.url()).not.toContain('/login');
    } finally {
      await deleteTestUser(user.userId);
    }
  });

  test('should maintain session after navigating away and back', async ({ page }) => {
    const user = await createTestUser('parent');
    
    try {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);

      // Wait for redirect to dashboard
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });
      await page.waitForLoadState('domcontentloaded');

      // Navigate to an unprotected page (like home)
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Navigate back to protected area
      await page.goto('/parent', { waitUntil: 'domcontentloaded' });

      // Should still be authenticated — allow redirect to resolve
      await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

      // Should NOT be on login
      expect(page.url()).not.toContain('/login');
    } finally {
      await deleteTestUser(user.userId);
    }
  });
});
