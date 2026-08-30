import { test, expect } from '@playwright/test';
import { supabaseAdmin } from './utils/supabase';

test.describe('Admin Export Functionality', () => {
  const adminEmail = `admin-export-test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
  const adminPassword = 'Password123!';

  test.beforeAll(async () => {
    // Create Admin User
    const { data: user, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          first_name: 'Admin',
          last_name: 'Test',
        },
      });

    if (createError) throw createError;

    // Ensure profile exists and has role admin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.user.id,
        email: adminEmail,
        role: 'admin',
        first_name: 'Admin',
        last_name: 'Test',
        code_of_conduct_agreed_at: new Date().toISOString(),
      });

    if (profileError) throw profileError;
  });

  test.afterAll(async () => {
    // Cleanup
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === adminEmail);
    if (user) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin');
  });

  test('Admin can export all classes CSV from the classes page', async ({
    page,
  }) => {
    await page.goto('/admin/classes');

    const exportButton = page.getByRole('button', {
      name: 'Export all classes',
    });
    await expect(exportButton).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('classes_all_');
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('Admin can export users matching the current search', async ({
    page,
  }) => {
    await page.goto(`/admin/users?search=${encodeURIComponent(adminEmail)}`);

    const exportButton = page.getByRole('button', { name: 'Export CSV' });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    const matchingExport = page.getByRole('menuitem', {
      name: /Export \d+ matching users/i,
    });
    await expect(matchingExport).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await matchingExport.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('users_matching_');
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
