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

// TODO: Fix Admin user creation in Supabase. Skipping for now.
// setup('authenticate as admin', async ({ page }) => {
//     const loginPage = new LoginPage(page);
//     await loginPage.login('admin@example.com', 'Password123');
//     await expect(page).toHaveURL(/\/(admin|parent|teacher|student)/);
//     await page.context().storageState({ path: authFile('admin') });
// });

