
import { test, expect } from '@playwright/test';
import { createTestUser } from './utils/helpers';
import { supabaseAdmin } from './utils/supabase';

test.describe('Parent Enrollment Flow', () => {
    let teacherUser: { email: string; userId: string; password: string };
    let parentUser: { email: string; userId: string; password: string };
    let className: string;

    test.beforeAll(async () => {
        // Create Teacher and Parent users
        teacherUser = await createTestUser('teacher');
        parentUser = await createTestUser('parent');
        className = `Enrollment Test Class ${Date.now()}`;
    });

    test.afterAll(async () => {
        // Cleanup users
        // if (teacherUser) await deleteTestUser(teacherUser.userId);
        // if (parentUser) await deleteTestUser(parentUser.userId);
    });

    test('Parent can browse and enroll child in a class', async ({ page }) => {
        test.setTimeout(180000); // 3 minutes

        // --- 1. Teacher Setup: Create and Publish Class ---
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[name="email"]', teacherUser.email);
        await page.fill('input[name="password"]', teacherUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*teacher/, { timeout: 30000 });

        // Navigate to Create Class
        await page.goto('/teacher/classes/new', { waitUntil: 'domcontentloaded' });
        
        // Fill Class Form
        await page.getByLabel('Class Name *').fill(className);
        await expect(page.getByLabel('Class Name *')).toHaveValue(className);

        await page.getByLabel('Description').fill('Test class for enrollment E2E');
        await page.getByLabel('Price ($) *').fill('50');
        await page.getByLabel('Capacity *').fill('5');
        await page.getByLabel('Location').fill('Room 101');
        
        // Select schedule
        // Try to handle Day/Block system
        // We look for triggers that might be select buttons
        
        // Try generic approach to find the Day select
        // Assuming label "Day" is associated with the trigger or nearby
        // If shadcn select, it's often a button with role 'combobox' or similar
        // Let's try locating by label text near a button
        
        // Fallback: If we can't easily find the select by label, we might need to debug UI
        // But let's try standard Select interactions provided by Playwright or custom locators
        
        // Select Day
        const dayTrigger = page.locator('button').filter({ hasText: 'Select a day' });
        await dayTrigger.click();
        await page.getByRole('option', { name: 'Monday' }).click();
        
        // Select Block
        const blockTrigger = page.locator('button').filter({ hasText: 'Select a block' });
        await blockTrigger.click();
        await page.getByRole('option', { name: 'Block 1' }).click();

        console.log(`Submitting form with Class Name: "${className}"`);
        await page.waitForTimeout(1000); // Wait for state updates

        await page.getByRole('button', { name: 'Create Class' }).click();
        
        // Check for any form errors
        // Wait for redirect or error
        // We expect redirect to /teacher/classes/[id]
        await expect(page).toHaveURL(/\/teacher\/classes\/.+/, { timeout: 30000 }).catch(async () => {
             // If timeout, check for error message
             const errorAlert = page.locator('.text-destructive'); 
             if (await errorAlert.isVisible()) {
                 throw new Error(`Class creation failed: ${await errorAlert.textContent()}`);
             }
             throw new Error('Class creation timed out and no error message found');
        });

        await expect(page).toHaveURL(/\/teacher\/classes\/.+/, { timeout: 30000 });
        
        // DEBUG: Verify class exists in DB
        const { data: dbClasses } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('teacher_id', teacherUser.userId);
        console.log(`[DEBUG] DB Classes for teacher ${teacherUser.userId}:`, dbClasses?.length, dbClasses);

        // Go back to Class List to Publish
        await page.goto('/teacher/classes', { waitUntil: 'domcontentloaded' });
        
        // Find the row with class name
        // Retry logic for class appearance (handling potential lag/caching)
        let classFound = false;
        for (let i = 0; i < 3; i++) {
            try {
                await expect(page.locator('tbody')).toBeVisible({ timeout: 5000 });
                classFound = true;
                break;
            } catch (_) {
                console.log(`Attempt ${i + 1}: Table body not found. Reloading...`);
                await page.reload({ waitUntil: 'domcontentloaded' });
            }
        }

        if (!classFound) {
             const bodyText = await page.locator('body').innerText();
             console.log('Final Page Body Content:', bodyText);
             throw new Error('Class table not found after retries.');
        }
        
        // Debug: Log the table content
        const tableText = await page.locator('table').innerText();
        console.log('Class Table Content:', tableText);

        const classRow = page.getByRole('row').filter({ hasText: className });
        await expect(classRow).toBeVisible();
        
        // Click Actions dropdown
        await classRow.getByRole('button', { name: 'Actions' }).click();
        
        // Click Publish
        await page.getByRole('menuitem', { name: 'Publish' }).click();
        
        // Confirm Dialog
        await page.getByRole('button', { name: 'Confirm' }).click();
        
        // Verify Published status
        await expect(classRow.getByText('Published')).toBeVisible();

        // Logout Teacher
        // Assuming user menu in top right
        const userMenuTrigger = page.locator('button[data-radix-collection-item=""] , button.rounded-full, button:has-text("User"), [data-testid="user-menu-trigger"]').first();
        if (await userMenuTrigger.isVisible()) {
            await userMenuTrigger.click();
            await page.getByText('Log out').click();
        } else {
             // Fallback logout via URL if UI is tricky
             // But usually we need to clear state. 
             // Let's try to just go to /login and see if it redirects or has signout
             // Or clear cookies.
             await page.context().clearCookies();
        }

        // --- 2. Parent Flow: Add Child and Enroll ---
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await page.fill('input[name="email"]', parentUser.email);
        await page.fill('input[name="password"]', parentUser.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*parent/, { timeout: 30000 });

        // Add Family Member
        await page.goto('/parent/family', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Add Family Member' }).click();
        
        const childFirstName = 'Kiddo';
        const childLastName = 'Test';
        const childEmail = `kiddo.${Date.now()}@test.com`;
        
        await page.fill('input[name="firstName"]', childFirstName);
        await page.fill('input[name="lastName"]', childLastName);
        await page.fill('input[name="email"]', childEmail);
        await page.fill('input[name="dob"]', '2016-01-01');
        
        // Select Grade
        await page.locator('button').filter({ hasText: 'Select grade' }).click();
        await page.getByRole('option', { name: 'Elementary' }).click();
        await page.getByRole('button', { name: 'Add Member' }).click();
        
        await expect(page.getByText(`${childFirstName} ${childLastName}`)).toBeVisible();

        // Browse Classes
        await page.goto('/parent/browse', { waitUntil: 'domcontentloaded' });
        
        // Search/Filter for class helper
        // Assuming there is a search bar or just scrolling
        await expect(page.getByText(className)).toBeVisible();
        
        // Click on the class to view details
        await page.getByText(className).click();
        
        // Wait for detail page
        await expect(page.getByRole('heading', { name: className })).toBeVisible();
        
        // Click Enroll Button
        await page.getByRole('button', { name: 'Enroll Student' }).click();
        
        // Select Child
        // This is likely a Select component
        const childSelectTrigger = page.locator('button[role="combobox"]').first(); 
        // Or check for "Select a child" text
        const specificChildTrigger = page.locator('button').filter({ hasText: /Select a child/ }).first();
        
        if (await specificChildTrigger.isVisible()) {
             await specificChildTrigger.click();
        } else if (await childSelectTrigger.isVisible()) {
             await childSelectTrigger.click();
        }
        
        // Select the child
        await page.getByRole('option', { name: `${childFirstName} ${childLastName}` }).click();
        
        // Submit Enrollment
        await page.getByRole('button', { name: 'Confirm Enrollment' }).click();
        
        // Verify Success
        // Expect success toast or redirection
        await expect(page.getByText(/Enrollment successful|Successfully enrolled/i)).toBeVisible();
        
        // Check Enrollments Page
        await page.goto('/parent/enrollments', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(className)).toBeVisible();
        await expect(page.getByText(`${childFirstName} ${childLastName}`)).toBeVisible();
    });
});
