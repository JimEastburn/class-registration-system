import type { Page, Locator } from '@playwright/test';

/**
 * Base Page Object
 * 
 * Provides common methods and utilities for all page objects.
 */
export abstract class BasePage {
  readonly page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }
  
  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
  
  /**
   * Wait for page to be loaded (no network activity)
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
  
  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }
  
  /**
   * Wait for a toast/notification message
   */
  async waitForToast(text: string): Promise<Locator> {
    return this.page.getByText(text).first();
  }
  
  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
