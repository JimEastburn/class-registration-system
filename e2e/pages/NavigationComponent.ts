import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Navigation Component Object
 * 
 * Handles sidebar and topbar navigation interactions.
 * Used as a composition in dashboard page objects.
 */
export class NavigationComponent extends BasePage {
  readonly sidebar: Locator;
  readonly topbar: Locator;
  readonly userMenu: Locator;
  readonly signOutButton: Locator;
  readonly portalSwitcher: Locator;
  
  constructor(page: Page) {
    super(page);
    this.sidebar = page.getByTestId('sidebar');
    this.topbar = page.getByTestId('topbar');
    this.userMenu = page.getByTestId('user-menu-trigger');
    this.signOutButton = page.getByTestId('logout-button');
    this.portalSwitcher = page.getByTestId('portal-switcher');
  }
  
  /**
   * Open user dropdown menu
   */
  async openUserMenu(): Promise<void> {
    await this.userMenu.waitFor({ state: 'visible', timeout: 10000 });
    await this.userMenu.click();
    // Wait for dropdown content to appear (Radix animation)
    await this.signOutButton.waitFor({ state: 'visible', timeout: 5000 });
  }
  
  /**
   * Sign out from the application
   */
  async signOut(): Promise<void> {
    await this.openUserMenu();
    await this.signOutButton.click();
  }
  
  /**
   * Switch portal view
   */
  async switchPortal(portal: 'parent' | 'teacher' | 'admin' | 'scheduler'): Promise<void> {
    await this.portalSwitcher.click();
    await this.page.getByTestId(`portal-option-${portal}`).click();
  }
  
  /**
   * Navigate to a sidebar menu item
   */
  async navigateTo(menuItem: string): Promise<void> {
    await this.sidebar.getByRole('link', { name: menuItem }).click();
  }
  
  /**
   * Check if portal switcher is visible
   */
  async isPortalSwitcherVisible(): Promise<boolean> {
    return await this.portalSwitcher.isVisible();
  }
}
