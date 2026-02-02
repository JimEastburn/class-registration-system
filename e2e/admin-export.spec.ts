
import { test, expect } from '@playwright/test';
import { supabaseAdmin } from './utils/supabase';

test.describe('Admin Export Functionality', () => {
    const adminEmail = `admin-export-test-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
    const adminPassword = 'Password123!';

    test.beforeAll(async () => {
        // Create Admin User
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
            user_metadata: { role: 'admin', first_name: 'Admin', last_name: 'Test' }
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
                code_of_conduct_agreed_at: new Date().toISOString()
            });

         if (profileError) throw profileError;
    });

    test.afterAll(async () => {
        // Cleanup
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.users.find(u => u.email === adminEmail);
        if (user) {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
        }
    });

    test('Admin can export classes CSV', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('input[name="email"]', adminEmail);
        await page.fill('input[name="password"]', adminPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/admin');

        // Check for Export Button
        const exportButton = page.getByRole('button', { name: 'Export Data' });
        await expect(exportButton).toBeVisible();

        // Click Export Button
        await exportButton.click();
        
        // Wait for download event
        const downloadPromise = page.waitForEvent('download');
        
        // Click Export Classes
        await page.getByRole('menuitem', { name: 'Export Classes' }).click();
        
        const download = await downloadPromise;
        
        // Verify filename
        expect(download.suggestedFilename()).toContain('classes_export');
        expect(download.suggestedFilename()).toContain('.csv');

        // Optional: Verify content if needed, but file system access might be tricky in pure e2e context without save
        // We trust the filename for now as indication of success
    });
});
