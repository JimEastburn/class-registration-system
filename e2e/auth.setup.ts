import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

const authFile = (role: string) => `playwright/.auth/${role}.json`;

setup('authenticate as parent', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('john@example.com', 'password123');
    await expect(page).toHaveURL(/\/parent/);
    await page.context().storageState({ path: authFile('parent') });
});

setup('authenticate as teacher', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('alice@example.com', 'password123');
    await expect(page).toHaveURL(/\/teacher/);
    await page.context().storageState({ path: authFile('teacher') });
});

setup('authenticate as admin', async ({ page }) => {
    const loginPage = new LoginPage(page);
    // Admin user is now created by global-setup.ts with proper password
    await loginPage.login('admin@example.com', 'Password123');
    // Admin might redirect to /admin or /parent depending on profile role
    await expect(page).toHaveURL(/\/(admin|parent|teacher|student)/);
    await page.context().storageState({ path: authFile('admin') });
});

setup('authenticate as student', async ({ page }) => {
    const loginPage = new LoginPage(page);
    // Student user is created by global-setup.ts
    await loginPage.login('student@example.com', 'Password123');
    await expect(page).toHaveURL(/\/student/);
    await page.context().storageState({ path: authFile('student') });
});
