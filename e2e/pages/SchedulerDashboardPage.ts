import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavigationComponent } from './NavigationComponent';

/**
 * Scheduler Dashboard Page Object
 * 
 * Handles class scheduler portal dashboard interactions.
 */
export class SchedulerDashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly statsCards: Locator;
  readonly unscheduledClassesList: Locator;
  readonly conflictAlertsList: Locator;
  readonly calendarGrid: Locator;
  
  constructor(page: Page) {
    super(page);
    this.navigation = new NavigationComponent(page);
    this.statsCards = page.getByTestId('scheduler-stats-cards');
    this.unscheduledClassesList = page.getByTestId('unscheduled-classes-list');
    this.conflictAlertsList = page.getByTestId('conflict-alerts-list');
    this.calendarGrid = page.getByTestId('master-calendar-grid');
  }
  
  /**
   * Navigate to scheduler dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/class-scheduler');
  }
  
  /**
   * Navigate to calendar view
   */
  async goToCalendar(): Promise<void> {
    await this.navigation.navigateTo('Calendar');
  }
  
  /**
   * Navigate to classes management
   */
  async goToClasses(): Promise<void> {
    await this.navigation.navigateTo('Classes');
  }
  
  /**
   * Navigate to create new class
   */
  async goToCreateClass(): Promise<void> {
    await this.page.getByTestId('create-class-button').click();
  }
  
  /**
   * Click on a class in the calendar
   */
  async openClassModal(className: string): Promise<void> {
    await this.calendarGrid.getByText(className).click();
  }
  
  /**
   * Get conflict count from alerts
   */
  async getConflictCount(): Promise<number> {
    const conflictBadge = this.page.getByTestId('conflict-count');
    const text = await conflictBadge.textContent();
    return text ? parseInt(text, 10) : 0;
  }
}
