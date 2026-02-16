import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object
 * 
 * Handles login form interactions.
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;
  
  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.getByTestId('login-submit-button');
    this.signUpLink = page.getByTestId('signup-link');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');
  }
  
  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    // Wait for the form to be ready
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }
  
  /**
   * Fill login form
   */
  async fillForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }
  
  /**
   * Submit login form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }
  
  /**
   * Complete login process
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillForm(email, password);
    await this.submit();
    // Wait for initial navigation after submit
    await this.page.waitForLoadState('domcontentloaded');
  }
  
  /**
   * Navigate to registration page
   */
  async goToSignUp(): Promise<void> {
    await this.signUpLink.click();
  }
  
  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
