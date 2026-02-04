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

      // Refresh the page
      await page.reload();

      // Should still be on parent dashboard (session persisted)
      await expect(async () => {
        const url = page.url();
        expect(url).toContain('/parent');
      }).toPass({ timeout: 10000 });

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

      // Navigate to a different protected page
      await page.goto('/parent/family');

      // Should be able to access the page (session persisted)
      await expect(async () => {
        const url = page.url();
        // Either on the family page or redirected there
        const isOnProtectedPage = url.includes('/parent');
        expect(isOnProtectedPage).toBe(true);
      }).toPass({ timeout: 10000 });

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

      // Navigate to an unprotected page (like home or about)
      await page.goto('/');

      // Navigate back to protected area
      await page.goto('/parent');

      // Should still be authenticated
      await expect(async () => {
        const url = page.url();
        expect(url).toContain('/parent');
      }).toPass({ timeout: 10000 });

      // Should NOT be on login
      expect(page.url()).not.toContain('/login');
    } finally {
      await deleteTestUser(user.userId);
    }
  });
});
