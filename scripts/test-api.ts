#!/usr/bin/env npx tsx
/**
 * API Endpoint Test Script
 * 
 * Tests API endpoints in the class-registration-system.
 * 
 * This script tests:
 * - Authentication error handling (401 responses)
 * - Input validation (400 responses)
 * - Webhook signature verification
 * 
 * Usage:
 *   npm run test:api              # Test against localhost:3000
 *   npm run test:api -- --url=https://your-app.com  # Test against custom URL
 * 
 * Note: For authenticated endpoint success tests, use the E2E tests with Playwright
 * which can properly handle cookie-based Supabase SSR authentication:
 *   npm run test:e2e
 */

import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Configuration
const BASE_URL = process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
};

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    duration: number;
}

const results: TestResult[] = [];

function log(message: string) {
    console.log(message);
}

function logSection(name: string) {
    log(`\n${colors.blue}━━━ ${name} ━━━${colors.reset}`);
}

function logResult(name: string, passed: boolean, message?: string, duration?: number) {
    const icon = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const timeStr = duration ? `${colors.dim}(${duration}ms)${colors.reset}` : '';
    log(`  ${icon} ${name} ${timeStr}`);
    if (message && !passed) {
        log(`    ${colors.dim}→ ${message}${colors.reset}`);
    }
}

async function test(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
        await fn();
        const duration = Date.now() - start;
        results.push({ name, passed: true, duration });
        logResult(name, true, undefined, duration);
    } catch (error) {
        const duration = Date.now() - start;
        const message = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, message, duration });
        logResult(name, false, message, duration);
    }
}

function expect(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

async function fetchApi(
    path: string,
    options: {
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
    } = {}
): Promise<Response> {
    const { method = 'GET', body, headers = {} } = options;

    const fetchHeaders: Record<string, string> = {
        ...headers,
    };

    if (body) {
        fetchHeaders['Content-Type'] = 'application/json';
    }

    return fetch(`${BASE_URL}${path}`, {
        method,
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
    });
}

// ============================================
// TEST SUITES
// ============================================

async function testCheckoutEndpoint() {
    logSection('/api/checkout (POST)');

    await test('returns 401 without authentication', async () => {
        const res = await fetchApi('/api/checkout', { method: 'POST', body: {} });
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('returns 401 with missing cookies', async () => {
        const res = await fetchApi('/api/checkout', {
            method: 'POST',
            body: { enrollmentId: '00000000-0000-0000-0000-000000000000' },
        });
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('returns JSON error response', async () => {
        const res = await fetchApi('/api/checkout', { method: 'POST', body: {} });
        const data = await res.json();
        expect(typeof data.error === 'string', 'Expected JSON error response');
    });
}

async function testExportEndpoint() {
    logSection('/api/export (GET)');

    await test('returns 401 without authentication', async () => {
        const res = await fetchApi('/api/export?type=users');
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('rejects access for each export type without auth', async () => {
        const types = ['users', 'classes', 'enrollments', 'payments'];
        for (const type of types) {
            const res = await fetchApi(`/api/export?type=${type}`);
            expect(res.status === 401, `Expected 401 for type=${type}, got ${res.status}`);
        }
    });

    await test('returns JSON error response', async () => {
        const res = await fetchApi('/api/export?type=users');
        const data = await res.json();
        expect(typeof data.error === 'string', 'Expected JSON error response');
    });
}

async function testInvoiceEndpoint() {
    logSection('/api/invoice (GET)');

    await test('returns 401 without authentication', async () => {
        const res = await fetchApi('/api/invoice?id=test');
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('returns 401 even with payment ID if not authenticated', async () => {
        const res = await fetchApi('/api/invoice?id=00000000-0000-0000-0000-000000000000');
        expect(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('returns JSON error response', async () => {
        const res = await fetchApi('/api/invoice');
        const data = await res.json();
        expect(typeof data.error === 'string', 'Expected JSON error response');
    });
}

async function testWebhookEndpoint() {
    logSection('/api/webhooks/stripe (POST)');

    await test('returns 400 without stripe-signature header', async () => {
        const res = await fetchApi('/api/webhooks/stripe', {
            method: 'POST',
            body: { type: 'test.event' },
        });
        expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns 400 with invalid signature', async () => {
        const res = await fetchApi('/api/webhooks/stripe', {
            method: 'POST',
            body: { type: 'test.event' },
            headers: { 'stripe-signature': 'invalid_signature' },
        });
        expect(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('returns JSON error for bad signature', async () => {
        const res = await fetchApi('/api/webhooks/stripe', {
            method: 'POST',
            body: {},
            headers: { 'stripe-signature': 't=1234,v1=abc,v0=def' },
        });
        expect(res.status === 400, `Expected 400, got ${res.status}`);
        const data = await res.json();
        expect(typeof data.error === 'string', 'Expected JSON error response');
    });
}

async function testHealthCheck() {
    logSection('Health Check');

    await test('home page responds', async () => {
        const res = await fetch(BASE_URL);
        expect(res.ok, `Expected 2xx status, got ${res.status}`);
    });

    await test('responds with HTML', async () => {
        const res = await fetch(BASE_URL);
        const contentType = res.headers.get('content-type');
        expect(contentType?.includes('text/html') === true, `Expected HTML, got ${contentType}`);
    });
}

// ============================================
// MAIN
// ============================================

async function main() {
    log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
    log(`${colors.blue}║     API Endpoint Test Suite            ║${colors.reset}`);
    log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
    log(`\n${colors.dim}Target: ${BASE_URL}${colors.reset}`);

    // Check if server is running
    try {
        const healthCheck = await fetch(BASE_URL, { method: 'HEAD' });
        log(`${colors.dim}Server status: ${healthCheck.status}${colors.reset}`);
    } catch (error) {
        log(`\n${colors.red}Error: Cannot connect to ${BASE_URL}${colors.reset}`);
        log(`${colors.dim}Make sure the development server is running with: npm run dev${colors.reset}\n`);
        process.exit(1);
    }

    // Run tests
    await testHealthCheck();
    await testCheckoutEndpoint();
    await testExportEndpoint();
    await testInvoiceEndpoint();
    await testWebhookEndpoint();

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    log(`\n${colors.blue}━━━ Summary ━━━${colors.reset}`);
    log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
    if (failed > 0) {
        log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
    }
    log(`  Total:  ${results.length}`);

    log(`\n${colors.dim}Note: For authenticated endpoint tests, run: npm run test:e2e${colors.reset}\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
});
