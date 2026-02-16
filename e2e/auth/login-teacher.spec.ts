import { test, expect, createTestUser, deleteTestUser } from '../fixtures';
import { LoginPage } from '../pages';

/**
 * Test: Sign in (Teacher) → /teacher
 * 
 * Corresponds to Gherkin Scenario: "Functionally Correct Sign In (Teacher)"
 * from tests/features/auth.feature
 * 
 * Given I have a registered account with role "teacher"
 * When I submit the login form with valid credentials
 * Then I should be successfully authenticated
 * And I should be redirected to "/teacher"
 */

test.describe('Teacher Login', () => {
  test('should redirect teacher to /teacher after login', async ({ page }) => {
    // Create a teacher user for this test
    const teacherUser = await createTestUser('teacher');
    
    try {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.login(teacherUser.email, teacherUser.password);

      // Wait for redirect to teacher dashboard
      await expect(page).toHaveURL(/\/teacher/, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
    } finally {
      // Cleanup: delete the test user
      await deleteTestUser(teacherUser.userId);
    }
  });

  test('teacher should see teacher-specific navigation', async ({ page }) => {
    const teacherUser = await createTestUser('teacher');
    
    try {
      const loginPage = new LoginPage(page);
      
      await loginPage.goto();
      await loginPage.login(teacherUser.email, teacherUser.password);

      // Wait for redirect
      await expect(page).toHaveURL(/\/teacher/, { timeout: 15000 });

      // Teacher dashboard should show teacher-specific elements
      const pageContent = await page.content();
      const hasTeacherContent = 
        pageContent.includes('Class') ||
        pageContent.includes('Teacher') ||
        pageContent.includes('student');
      
      expect(hasTeacherContent).toBe(true);
    } finally {
      await deleteTestUser(teacherUser.userId);
    }
  });
});
