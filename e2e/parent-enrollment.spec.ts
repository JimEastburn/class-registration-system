
import { test, expect, createTestUser, deleteTestUser } from './fixtures';
import { LoginPage, NavigationComponent } from './pages';
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
        if (teacherUser) await deleteTestUser(teacherUser.userId);
        if (parentUser) await deleteTestUser(parentUser.userId);
    });

    test('Parent can browse and enroll child in a class', async ({ page }) => {
        test.setTimeout(180000); // 3 minutes

        // --- 1. Teacher Setup: Create and Publish Class ---
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(teacherUser.email, teacherUser.password);
        await expect(page).toHaveURL(/.*teacher/, { timeout: 30000 });

        // Navigate to Create Class
        await page.goto('/teacher/classes/new', { waitUntil: 'domcontentloaded' });
        
        // Fill Class Form using data-testid selectors
        await page.getByTestId('class-name-input').fill(className);
        await expect(page.getByTestId('class-name-input')).toHaveValue(className);

        await page.getByTestId('class-description-input').fill('Test class for enrollment E2E');
        await page.getByTestId('class-capacity-input').fill('5');

        console.log(`Submitting form with Class Name: "${className}"`);
        await page.waitForTimeout(1000); // Wait for state updates

        await page.getByTestId('class-submit-button').click();
        
        // Wait for redirect to class detail page
        await expect(page).toHaveURL(/\/teacher\/classes\/.+/, { timeout: 30000 }).catch(async () => {
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
        await expect(classRow.getByText('Published')).toBeVisible({ timeout: 10000 });

        // Logout Teacher using NavigationComponent POM  
        const navigation = new NavigationComponent(page);
        await navigation.signOut();

        // Wait for redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

        // --- 2. Parent Flow: Add Child and Enroll ---
        await loginPage.goto();
        await loginPage.login(parentUser.email, parentUser.password);
        await expect(page).toHaveURL(/.*parent/, { timeout: 30000 });

        // Add Family Member
        await page.goto('/parent/family', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Add Family Member' }).click();
        
        const childFirstName = 'Kiddo';
        const childLastName = 'Test';
        const childEmail = `kiddo.${Date.now()}@test.com`;
        
        await page.getByTestId('family-first-name-input').fill(childFirstName);
        await page.getByTestId('family-last-name-input').fill(childLastName);
        await page.getByTestId('family-email-input').fill(childEmail);
        
        // Select Grade using data-testid
        await page.getByTestId('family-grade-select').click();
        await page.getByRole('option', { name: 'Elementary' }).click();
        await page.getByTestId('family-submit-button').click();
        
        await expect(page.getByText(`${childFirstName} ${childLastName}`)).toBeVisible({ timeout: 10000 });

        // Browse Classes
        await page.goto('/parent/browse', { waitUntil: 'domcontentloaded' });
        
        // Find the class
        await expect(page.getByText(className)).toBeVisible({ timeout: 15000 });
        
        // Click on the class to view details
        await page.getByText(className).click();
        
        // Wait for detail page
        await expect(page.getByRole('heading', { name: className })).toBeVisible({ timeout: 10000 });
        
        // Click Enroll Button
        await page.getByRole('button', { name: 'Enroll Student' }).click();
        
        // Select Child — try both Select component patterns
        const specificChildTrigger = page.locator('button').filter({ hasText: /Select a child/ }).first();
        const childSelectTrigger = page.locator('button[role="combobox"]').first(); 
        
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
        await expect(page.getByText(/Enrollment successful|Successfully enrolled/i)).toBeVisible({ timeout: 15000 });
        
        // Check Enrollments Page
        await page.goto('/parent/enrollments', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(className)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(`${childFirstName} ${childLastName}`)).toBeVisible();
    });
});
