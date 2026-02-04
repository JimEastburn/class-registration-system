import { test as setup } from '@playwright/test';
import { createTestUser, getAuthStatePath, type TestUser } from './fixtures';
import type { UserRole } from '../src/types';

/**
 * Auth Setup Project
 * 
 * This setup file creates authenticated states for each role.
 * These states are saved to disk and reused across tests for efficiency.
 */

const ROLES_TO_SETUP: UserRole[] = [
  'parent',
  'teacher',
  'student',
  'admin',
  'class_scheduler',
  'super_admin'
];

// Track created users for potential cleanup
const createdUsers: TestUser[] = [];

setup.describe('Auth State Setup', () => {
  for (const role of ROLES_TO_SETUP) {
    setup(`setup ${role} auth state`, async ({ page, context }) => {
      // Create test user for this role
      const user = await createTestUser(role);
      createdUsers.push(user);
      
      console.log(`Created ${role} user: ${user.email}`);
      
      // Navigate to login
      await page.goto('/login');
      
      // Fill login form
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      
      // Submit login
      await page.getByTestId('login-submit-button').click();
      
      // Wait a moment for the form submission to process
      await page.waitForTimeout(1000);
      
      // Check for error message first
      const errorMessage = await page.getByTestId('login-error-message').textContent().catch(() => null);
      if (errorMessage) {
        console.error(`Login failed for ${role}: ${errorMessage}`);
        throw new Error(`Login failed: ${errorMessage}`);
      }
      
      // Wait for redirect based on role
      const roleRedirects: Record<UserRole, string> = {
        parent: '/parent',
        teacher: '/teacher',
        student: '/student',
        admin: '/admin',
        class_scheduler: '/class-scheduler',
        super_admin: '/admin'
      };
      
      const expectedPath = roleRedirects[role];
      
      // Wait for navigation to complete (long timeout to handle slow server)
      await page.waitForURL(`**${expectedPath}**`, { timeout: 60000 });
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      console.log(`${role} logged in successfully, saving state...`);
      
      // Save authenticated state
      const statePath = getAuthStatePath(role);
      await context.storageState({ path: statePath });
      
      console.log(`${role} auth state saved to: ${statePath}`);
    });
  }
});
