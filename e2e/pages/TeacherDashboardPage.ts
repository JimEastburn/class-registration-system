import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { NavigationComponent } from './NavigationComponent';

/**
 * Teacher Dashboard Page Object
 * 
 * Handles teacher portal dashboard interactions.
 */
export class TeacherDashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly statsCards: Locator;
  readonly classListSection: Locator;
  readonly createClassButton: Locator;
  readonly todayScheduleCard: Locator;
  
  constructor(page: Page) {
    super(page);
    this.navigation = new NavigationComponent(page);
    this.statsCards = page.getByTestId('teacher-stats-cards');
    this.classListSection = page.getByTestId('teacher-class-list');
    this.createClassButton = page.getByTestId('create-class-button');
    this.todayScheduleCard = page.getByTestId('today-schedule-card');
  }
  
  /**
   * Navigate to teacher dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/teacher');
  }
  
  /**
   * Navigate to create new class
   */
  async goToCreateClass(): Promise<void> {
    await this.createClassButton.click();
  }
  
  /**
   * Navigate to classes list
   */
  async goToClasses(): Promise<void> {
    await this.navigation.navigateTo('Classes');
  }
  
  /**
   * Navigate to blocked students
   */
  async goToBlockedStudents(): Promise<void> {
    await this.navigation.navigateTo('Blocked');
  }
  
  /**
   * Click on a class row to view details
   */
  async openClassDetails(className: string): Promise<void> {
    await this.page.getByRole('link', { name: className }).click();
  }
}
