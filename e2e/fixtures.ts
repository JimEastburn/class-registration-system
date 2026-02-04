/* eslint-disable react-hooks/rules-of-hooks */
// Note: ESLint incorrectly treats Playwright's `use` function as a React hook

import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { supabaseAdmin } from './utils/supabase';
import type { UserRole } from '../src/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Auth state directory for storing authenticated session states
 */
const AUTH_STATE_DIR = path.join(__dirname, '.auth-states');

// Ensure auth state directory exists
if (!fs.existsSync(AUTH_STATE_DIR)) {
  fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
}

/**
 * Get the path for a role's auth state file
 */
export function getAuthStatePath(role: UserRole): string {
  return path.join(AUTH_STATE_DIR, `${role}.json`);
}

/**
 * Check if auth state file exists and is valid (not expired)
 */
function isAuthStateValid(role: UserRole): boolean {
  const statePath = getAuthStatePath(role);
  if (!fs.existsSync(statePath)) {
    return false;
  }
  
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    // Check if there are any cookies (basic validity check)
    if (!state.cookies || state.cookies.length === 0) {
      return false;
    }
    
    // Check if any auth cookie exists and isn't expired
    const authCookie = state.cookies.find((c: { name: string }) => 
      c.name.includes('auth-token')
    );
    
    if (authCookie && authCookie.expires) {
      // Check if cookie expires in the future (with 5 min buffer)
      const expiresAt = authCookie.expires * 1000;
      return expiresAt > Date.now() + (5 * 60 * 1000);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Test user credentials type
 */
export interface TestUser {
  email: string;
  password: string;
  userId: string;
  role: UserRole;
}

/**
 * Generate unique email for test users
 */
function generateUniqueEmail(role: UserRole): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `e2e-${role}-${timestamp}-${random}@example.com`;
}

/**
 * Create a test user with the specified role
 */
export async function createTestUser(role: UserRole): Promise<TestUser> {
  const email = generateUniqueEmail(role);
  const password = 'Password123!';
  const firstName = 'E2E';
  const lastName = role.charAt(0).toUpperCase() + role.slice(1);

  // Create auth user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: role
    }
  });

  if (createError) {
    throw new Error(`Failed to create auth user: ${createError.message}`);
  }

  const userId = userData.user.id;

  // Upsert profile with correct role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      role: role,
      first_name: firstName,
      last_name: lastName,
      code_of_conduct_agreed_at: new Date().toISOString()
    });

  if (profileError) {
    // Cleanup on failure
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  return {
    email,
    password,
    userId,
    role
  };
}

/**
 * Delete a test user by ID
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Error deleting test user:', error);
  }
}

/**
 * Login a user and save their session state
 */
async function loginAndSaveState(
  page: Page,
  context: BrowserContext,
  user: TestUser
): Promise<void> {
  // Navigate to login
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  // Submit
  await page.getByTestId('login-submit-button').click();
  
  // Wait for redirect based on role
  const roleRedirects: Record<UserRole, string> = {
    parent: '/parent',
    teacher: '/teacher',
    student: '/student',
    admin: '/admin',
    class_scheduler: '/class-scheduler',
    super_admin: '/admin'
  };
  
  const expectedPath = roleRedirects[user.role] || '/parent';
  await page.waitForURL(`**${expectedPath}**`, { timeout: 15000 });
  
  // Save storage state
  await context.storageState({ path: getAuthStatePath(user.role) });
}

/**
 * Ensure auth state exists for a role, creating if necessary
 */
export async function ensureAuthState(
  page: Page,
  context: BrowserContext,
  role: UserRole
): Promise<TestUser> {
  if (isAuthStateValid(role)) {
    // Return a dummy user - state already exists
    return {
      email: `existing-${role}@test.com`,
      password: 'Password123!',
      userId: 'existing',
      role
    };
  }
  
  // Create new user and login
  const user = await createTestUser(role);
  await loginAndSaveState(page, context, user);
  return user;
}

// Extend Playwright test with auth fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  parentPage: Page;
  teacherPage: Page;
  studentPage: Page;
  adminPage: Page;
  schedulerPage: Page;
  superAdminPage: Page;
  testUser: TestUser;
};


/**
 * Extended test with auth fixtures
 */
export const test = base.extend<AuthFixtures>({
  // Generic authenticated page (requires storageState in test config)
  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },

  // Role-specific pages
  parentPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('parent');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Parent auth state not found. Run auth setup first.');
    }
  },

  teacherPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('teacher');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Teacher auth state not found. Run auth setup first.');
    }
  },

  studentPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('student');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Student auth state not found. Run auth setup first.');
    }
  },

  adminPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('admin');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Admin auth state not found. Run auth setup first.');
    }
  },

  schedulerPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('class_scheduler');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Scheduler auth state not found. Run auth setup first.');
    }
  },

  superAdminPage: async ({ browser }, use) => {
    const statePath = getAuthStatePath('super_admin');
    if (fs.existsSync(statePath)) {
      const context = await browser.newContext({ storageState: statePath });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      throw new Error('Super Admin auth state not found. Run auth setup first.');
    }
  },

  // Create a fresh test user for tests that need isolation
  testUser: async ({}, use) => {
    const user = await createTestUser('parent');
    await use(user);
    // Cleanup after test
    await deleteTestUser(user.userId);
  }
});

export { expect };
