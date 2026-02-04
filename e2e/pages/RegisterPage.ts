import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import type { UserRole } from '../../src/types';

/**
 * Registration Page Object
 * 
 * Handles user registration form interactions.
 */
export class RegisterPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly roleSelectTrigger: Locator;
  readonly codeOfConductCheckbox: Locator;
  readonly submitButton: Locator;
  readonly signInLink: Locator;
  
  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.roleSelectTrigger = page.getByTestId('role-select-trigger');
    this.codeOfConductCheckbox = page.locator('#codeOfConduct');
    this.submitButton = page.locator('button[type="submit"]');
    this.signInLink = page.getByText('Sign in');
  }
  
  /**
   * Navigate to registration page
   */
  async goto(): Promise<void> {
    await this.page.goto('/register');
  }
  
  /**
   * Select a role from the dropdown
   */
  async selectRole(role: UserRole): Promise<void> {
    await this.roleSelectTrigger.click();
    await this.page.getByTestId(`role-option-${role}`).click();
  }
  
  /**
   * Fill registration form
   */
  async fillForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role?: UserRole;
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    
    if (data.role) {
      await this.selectRole(data.role);
    }
    
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
    
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
  }
  
  /**
   * Accept code of conduct
   */
  async acceptCodeOfConduct(): Promise<void> {
    await this.codeOfConductCheckbox.click();
  }
  
  /**
   * Submit registration form
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }
  
  /**
   * Complete registration process
   */
  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role?: UserRole;
  }): Promise<void> {
    await this.fillForm(data);
    await this.acceptCodeOfConduct();
    await this.submit();
  }
  
  /**
   * Navigate to login page
   */
  async goToSignIn(): Promise<void> {
    await this.signInLink.click();
  }
}
