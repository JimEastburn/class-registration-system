import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class StudentPage extends BasePage {
    readonly scheduleLink: Locator;
    readonly classesLink: Locator;

    constructor(page: Page) {
        super(page);
        this.scheduleLink = page.getByRole('link', { name: 'My Schedule' });
        this.classesLink = page.getByRole('link', { name: 'My Classes' });
    }

    async goToSchedule() {
        await this.scheduleLink.first().click();
    }

    async goToClasses() {
        await this.classesLink.first().click();
    }
}
