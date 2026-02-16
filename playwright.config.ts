import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',

    // Global setup and teardown for test isolation
    globalSetup: require.resolve('./e2e/global-setup'),
    globalTeardown: require.resolve('./e2e/global-teardown'),

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    projects: [
        // Setup project - run serially to avoid server overload
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            timeout: 60000, // 60s — no cold-start compilation with production build
            fullyParallel: false, // Run setup tests sequentially
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
            dependencies: ['setup'],
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup'],
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup'],
        },
    ],

    webServer: {
        command: process.env.CI
            ? 'npm run build && npm run start'
            : 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000, // 3 min — allows time for production build on CI
    },
});
