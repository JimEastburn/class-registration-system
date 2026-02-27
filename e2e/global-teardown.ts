import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  // Global teardown logic here
}

export default globalTeardown;
