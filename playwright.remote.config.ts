import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for running tests against a remote deployment.
 * No webServer block — assumes the target is already running.
 * 
 * Usage:
 *   npx playwright test --config=playwright.remote.config.ts
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'html',

    globalSetup: require.resolve('./e2e/global-setup'),
    globalTeardown: require.resolve('./e2e/global-teardown'),

    use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL
          || 'https://class-registration-system-git-master-jimeastburns-projects.vercel.app',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            timeout: 120000,
            fullyParallel: false,
        },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],

    // No webServer — testing against a remote deployment
});
