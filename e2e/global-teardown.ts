import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Global teardown logic here
}

export default globalTeardown;
