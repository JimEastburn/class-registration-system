import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
    readonly usersLink: Locator;
    readonly reportsLink: Locator;

    constructor(page: Page) {
        super(page);
        this.usersLink = page.getByTestId('nav-link-users');
        this.reportsLink = page.getByTestId('nav-link-reports');
    }

    async goToUsers() {
        await this.usersLink.first().click();
    }

    async goToReports() {
        await this.reportsLink.first().click();
    }
}
