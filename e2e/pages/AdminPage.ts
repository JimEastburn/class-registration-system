import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
    readonly usersLink: Locator;
    readonly classesLink: Locator;
    readonly enrollmentsLink: Locator;
    readonly paymentsLink: Locator;
    readonly reportsLink: Locator;

    constructor(page: Page) {
        super(page);
        this.usersLink = page.getByTestId('nav-link-users');
        this.classesLink = page.getByTestId('nav-link-classes');
        this.enrollmentsLink = page.getByTestId('nav-link-enrollments');
        this.paymentsLink = page.getByTestId('nav-link-payments');
        this.reportsLink = page.getByTestId('nav-link-reports');
    }

    async goToUsers() {
        await this.usersLink.first().click();
    }

    async goToClasses() {
        await this.classesLink.first().click();
    }

    async goToEnrollments() {
        await this.enrollmentsLink.first().click();
    }

    async goToPayments() {
        await this.paymentsLink.first().click();
    }

    async goToReports() {
        await this.reportsLink.first().click();
    }
}
