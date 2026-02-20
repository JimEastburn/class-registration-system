import { test, expect } from '@playwright/test';

// Generate random email to ensure isolation
const randomId = Math.random().toString(36).substring(7);
const parentEmail = `parent-${randomId}@example.com`;
const password = 'Password123!';

test.describe('Parent Family Management', () => {

    test('Parent can add a family member', async ({ page }) => {
        test.setTimeout(90000);

        // --- 1. Registration Phase ---
        await page.goto('/register');
        
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'Parent');
        await page.fill('input[name="email"]', parentEmail);
        
        // Select Role: Parent
        await page.click('button[data-testid="role-select-trigger"]');
        await page.click('div[data-testid="role-option-parent"]');

        await page.fill('input[name="phone"]', '555-0123');
        await page.fill('input[name="password"]', password);
        await page.fill('input[name="confirmPassword"]', password);
        await page.click('#codeOfConduct');
        await page.click('button[type="submit"]');

        // Deterministic Flow: Expect Success Message -> Click Login -> Login
        try {
            await expect(page.getByTestId('registration-success')).toBeVisible({ timeout: 15000 });
        } catch (e) {
            // Check for error message if success failed
            const errorElement = page.locator('.bg-red-500\\/20'); // class found in RegisterForm
            if (await errorElement.isVisible()) {
                const errorText = await errorElement.textContent();
                throw new Error(`Registration failed with UI error: ${errorText}`);
            }
            
            console.log('--- FAILURE DEBUG: PAGE CONTENT ---');
            console.log(await page.content());
            console.log('--- END DEBUG ---');
            
            throw e;
        }
        
        // Click "Back to Login"
        await page.getByRole('link', { name: 'Back to Login' }).click();

        // Login
        await expect(page).toHaveURL(/\/login/);
        await page.getByTestId('email-input').fill(parentEmail);
        await page.getByTestId('password-input').fill(password);
        await page.getByTestId('login-submit-button').click();

        // Verify Dashboard Access
        await expect(page).toHaveURL(/\/parent/, { timeout: 15000 });

        // --- 2. Action Phase (Add Family Member) ---
        
        // Navigate to Family page
        await page.goto('/parent/family', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/parent\/family/);

        // Open Dialog
        await page.getByRole('button', { name: 'Add Family Member' }).click();

        // Fill Form
        await expect(page.getByRole('heading', { name: 'Add Family Member' })).toBeVisible();
        
        const childFirstName = 'Little';
        const childLastName = `Junior-${randomId}`;

        await page.getByTestId('family-first-name-input').fill(childFirstName);
        await page.getByTestId('family-last-name-input').fill(childLastName);

        // Select Grade using data-testid
        await page.getByTestId('family-grade-select').click();
        await page.getByRole('option', { name: 'Elementary' }).click();

        // Submit
        await page.getByTestId('family-submit-button').click();

        // --- 3. Verification Phase ---
        
        // 1. Success Toast or Message  
        await expect(page.getByText(`${childFirstName} ${childLastName} has been added`)).toBeVisible({ timeout: 10000 });

        // 2. Member appears in list
        await expect(page.getByText(`${childFirstName} ${childLastName}`)).toBeVisible();
    });
});
