---
name: e2e-testing-patterns
description: Master end-to-end testing with Playwright to build reliable test suites that catch bugs, improve confidence, and enable fast deployment. Use when implementing E2E tests, debugging flaky tests, or establishing testing standards.
---

# E2E Testing Patterns

Build reliable, fast, and maintainable end-to-end test suites with Playwright that provide confidence to ship code quickly and catch regressions before users do.

## When to Use This Skill

- Implementing end-to-end test automation
- Debugging flaky or unreliable tests
- Testing critical user workflows
- Setting up CI/CD test pipelines
- Testing across multiple browsers
- Validating accessibility requirements
- Testing responsive designs
- Establishing E2E testing standards

## Core Concepts

### What to Test with E2E

- Critical user journeys (login, enrollment, checkout)
- Complex interactions (multi-step forms, role-specific flows)
- Cross-browser compatibility
- Real API integration
- Authentication flows across multiple roles

### What NOT to Test with E2E

- Unit-level logic (use unit tests)
- API contracts (use integration tests)
- Edge cases (too slow)
- Internal implementation details

### The Testing Pyramid

```
        /\
       /E2E\         ← Few, focused on critical paths
      /─────\
     /Integr\        ← More, test component interactions
    /────────\
   /Unit Tests\      ← Many, fast, isolated
  /────────────\
```

## Playwright Setup

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'results.xml' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

## Pattern 1: Page Object Model

```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

## Pattern 2: Auth State Management

For apps with Supabase Auth, manage authentication state across tests using `storageState`:

### Setup: Create Auth Fixtures per Role

```typescript
// e2e/fixtures/auth.ts
import { test as base, type Page } from '@playwright/test';

type AuthFixtures = {
  parentPage: Page;
  teacherPage: Page;
  adminPage: Page;
};

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(parent|teacher|admin|student)/);
}

export const test = base.extend<AuthFixtures>({
  parentPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, process.env.TEST_PARENT_EMAIL!, process.env.TEST_PARENT_PASSWORD!);
    await use(page);
    await context.close();
  },
  teacherPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, process.env.TEST_TEACHER_EMAIL!, process.env.TEST_TEACHER_PASSWORD!);
    await use(page);
    await context.close();
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAs(page, process.env.TEST_ADMIN_EMAIL!, process.env.TEST_ADMIN_PASSWORD!);
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Using Auth Fixtures in Tests

```typescript
import { test, expect } from './fixtures/auth';

test('parent can view their enrolled classes', async ({ parentPage }) => {
  await parentPage.goto('/parent/classes');
  await expect(parentPage.getByRole('heading', { name: 'My Classes' })).toBeVisible();
});

test('admin can view all enrollments', async ({ adminPage }) => {
  await adminPage.goto('/admin/enrollments');
  await expect(adminPage.getByRole('table')).toBeVisible();
});

test('teacher cannot access admin portal', async ({ teacherPage }) => {
  await teacherPage.goto('/admin');
  // Should redirect away from admin
  await expect(teacherPage).not.toHaveURL(/\/admin/);
});
```

## Pattern 3: Multi-Role Flow Testing

Test workflows that span multiple roles (e.g., admin creates class → parent enrolls):

```typescript
import { test, expect } from './fixtures/auth';

test('enrollment flow across roles', async ({ adminPage, parentPage }) => {
  // Step 1: Admin creates a class
  await adminPage.goto('/admin/classes/new');
  await adminPage.getByLabel('Class Name').fill('Test Art Class');
  await adminPage.getByRole('button', { name: 'Create' }).click();
  await expect(adminPage.getByText('Class created')).toBeVisible();

  // Step 2: Parent enrolls a child
  await parentPage.goto('/parent/classes');
  await parentPage.getByText('Test Art Class').click();
  await parentPage.getByRole('button', { name: 'Enroll' }).click();
  await expect(parentPage.getByText('Enrolled')).toBeVisible();
});
```

## Pattern 4: Database-Backed Setup and Teardown

Use Supabase client directly in tests for reliable data setup:

```typescript
// e2e/helpers/db.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for test setup
);

export async function createTestClass(name: string) {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, capacity: 10, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cleanupTestData(prefix: string) {
  await supabase.from('classes').delete().like('name', `${prefix}%`);
}
```

```typescript
// In tests
import { createTestClass, cleanupTestData } from './helpers/db';

test.beforeAll(async () => {
  await createTestClass('E2E-Test-Class');
});

test.afterAll(async () => {
  await cleanupTestData('E2E-Test-');
});
```

## Pattern 5: Waiting Strategies

```typescript
// ❌ Bad: Fixed timeouts
await page.waitForTimeout(3000); // Flaky!

// ✅ Good: Wait for specific conditions
await page.waitForLoadState('networkidle');
await page.waitForURL('/dashboard');

// ✅ Better: Auto-waiting with assertions
await expect(page.getByText('Welcome')).toBeVisible();
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();

// Wait for API response
const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/users') && response.status() === 200
);
await page.getByRole('button', { name: 'Load Users' }).click();
await responsePromise;
```

## Pattern 6: Network Mocking

```typescript
// Mock API responses
test('displays error when API fails', async ({ page }) => {
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Failed to load users')).toBeVisible();
});

// Mock third-party services (e.g., Stripe)
test('payment flow with mocked Stripe', async ({ page }) => {
  await page.route('**/api/stripe/**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 'mock_payment_id', status: 'succeeded' }),
    });
  });
});
```

## Pattern 7: Visual Regression Testing

```typescript
test('homepage looks correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    maxDiffPixels: 100,
  });
});
```

## Pattern 8: Accessibility Testing

```typescript
import AxeBuilder from '@axe-core/playwright';

test('page should not have accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .exclude('#third-party-widget')
    .analyze();
  expect(results.violations).toEqual([]);
});
```

## Best Practices

1. **Use Data Attributes**: `data-testid` for stable selectors
2. **Avoid Brittle Selectors**: Don't rely on CSS classes or DOM structure
3. **Test User Behavior**: Click, type, see — not implementation details
4. **Keep Tests Independent**: Each test should run in isolation
5. **Clean Up Test Data**: Create and destroy test data in each test
6. **Use Page Objects**: Encapsulate page logic
7. **Meaningful Assertions**: Check actual user-visible behavior
8. **Optimize for Speed**: Mock when possible, parallel execution

```typescript
// ❌ Bad selectors
page.locator('.btn.btn-primary.submit-button').click();
page.locator('div > form > div:nth-child(2) > input').fill('text');

// ✅ Good selectors
page.getByRole('button', { name: 'Submit' }).click();
page.getByLabel('Email address').fill('user@example.com');
page.getByTestId('email-input').fill('user@example.com');
```

## Common Pitfalls

- **Flaky Tests**: Use proper waits, not fixed timeouts
- **Slow Tests**: Mock external APIs, use parallel execution
- **Over-Testing**: Don't test every edge case with E2E
- **Coupled Tests**: Tests should not depend on each other
- **Poor Selectors**: Avoid CSS classes and nth-child
- **No Cleanup**: Clean up test data after each test
- **Testing Implementation**: Test user behavior, not internals
- **No Auth State Reuse**: Create auth fixtures instead of logging in every test

## Debugging Failing Tests

```bash
# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run a single test
npx playwright test -g "test name"
```

```typescript
// Add test.step for better reporting
test('checkout flow', async ({ page }) => {
  await test.step('Add item to cart', async () => {
    await page.goto('/products');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
  });

  await test.step('Proceed to checkout', async () => {
    await page.goto('/cart');
    await page.getByRole('button', { name: 'Checkout' }).click();
  });
});

// Inspect page state mid-test
await page.pause();
```
