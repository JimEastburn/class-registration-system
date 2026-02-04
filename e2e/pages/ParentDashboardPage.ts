import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavigationComponent } from './NavigationComponent';

/**
 * Parent Dashboard Page Object
 * 
 * Handles parent portal dashboard interactions.
 */
export class ParentDashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly familySummaryCard: Locator;
  readonly upcomingClassesCard: Locator;
  readonly pendingEnrollmentsCard: Locator;
  readonly addChildButton: Locator;
  readonly browseClassesButton: Locator;
  
  constructor(page: Page) {
    super(page);
    this.navigation = new NavigationComponent(page);
    this.familySummaryCard = page.getByTestId('family-summary-card');
    this.upcomingClassesCard = page.getByTestId('upcoming-classes-card');
    this.pendingEnrollmentsCard = page.getByTestId('pending-enrollments-card');
    this.addChildButton = page.getByTestId('add-child-button');
    this.browseClassesButton = page.getByTestId('browse-classes-button');
  }
  
  /**
   * Navigate to parent dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/parent');
  }
  
  /**
   * Get family member count from summary card
   */
  async getFamilyMemberCount(): Promise<number> {
    const text = await this.familySummaryCard.textContent();
    const match = text?.match(/(\d+)\s*member/i);
    return match ? parseInt(match[1], 10) : 0;
  }
  
  /**
   * Navigate to add child form
   */
  async goToAddChild(): Promise<void> {
    await this.addChildButton.click();
  }
  
  /**
   * Navigate to browse classes
   */
  async goToBrowseClasses(): Promise<void> {
    await this.browseClassesButton.click();
  }
  
  /**
   * Navigate to family management
   */
  async goToFamily(): Promise<void> {
    await this.navigation.navigateTo('Family');
  }
  
  /**
   * Navigate to enrollments
   */
  async goToEnrollments(): Promise<void> {
    await this.navigation.navigateTo('Enrollments');
  }
  
  /**
   * Navigate to payment history
   */
  async goToPayments(): Promise<void> {
    await this.navigation.navigateTo('Payments');
  }
}
