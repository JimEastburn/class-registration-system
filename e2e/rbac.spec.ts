import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('RBAC Isolation', () => {
    const teacher = { email: 'alice@example.com', password: 'password123' };
    const parent = { email: 'john@example.com', password: 'password123' };

    test('should redirect unauthenticated users to login', async ({ page }) => {
        const protectedPaths = ['/admin', '/teacher', '/parent', '/student'];
        for (const path of protectedPaths) {
            await page.goto(path);
            await expect(page).toHaveURL(/\/login/);
        }
    });

    test('parent should not access teacher dashboard', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(parent.email, parent.password);
        await expect(page).toHaveURL(/\/parent/);

        await page.goto('/teacher');
        await expect(page).toHaveURL(/\/parent/);
    });

    test('teacher should not access admin dashboard', async ({ page }) => {
        const loginPage = new LoginPage(page);
        await loginPage.login(teacher.email, teacher.password);
        await expect(page).toHaveURL(/\/teacher/);

        await page.goto('/admin');
        await expect(page).toHaveURL(/\/teacher/);
    });
});
