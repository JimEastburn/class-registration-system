import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavigationComponent } from './NavigationComponent';

/**
 * Admin Dashboard Page Object
 * 
 * Handles admin portal dashboard interactions.
 */
export class AdminDashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly systemStatsCards: Locator;
  readonly recentActivityFeed: Locator;
  readonly pendingActionsCard: Locator;
  
  constructor(page: Page) {
    super(page);
    this.navigation = new NavigationComponent(page);
    this.systemStatsCards = page.getByTestId('system-stats-cards');
    this.recentActivityFeed = page.getByTestId('recent-activity-feed');
    this.pendingActionsCard = page.getByTestId('pending-actions-card');
  }
  
  /**
   * Navigate to admin dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin');
  }
  
  /**
   * Navigate to user management
   */
  async goToUsers(): Promise<void> {
    await this.navigation.navigateTo('Users');
  }
  
  /**
   * Navigate to classes management
   */
  async goToClasses(): Promise<void> {
    await this.navigation.navigateTo('Classes');
  }
  
  /**
   * Navigate to enrollments management
   */
  async goToEnrollments(): Promise<void> {
    await this.navigation.navigateTo('Enrollments');
  }
  
  /**
   * Navigate to payments management
   */
  async goToPayments(): Promise<void> {
    await this.navigation.navigateTo('Payments');
  }
  
  /**
   * Navigate to audit logs
   */
  async goToAuditLogs(): Promise<void> {
    await this.navigation.navigateTo('Audit');
  }
  
  /**
   * Navigate to settings
   */
  async goToSettings(): Promise<void> {
    await this.navigation.navigateTo('Settings');
  }
  
  /**
   * Export data to CSV
   */
  async exportCsv(type: 'users' | 'classes' | 'enrollments' | 'payments'): Promise<void> {
    const exportButton = this.page.getByTestId('export-button');
    await exportButton.click();
    await this.page.getByTestId(`export-${type}`).click();
  }
}
