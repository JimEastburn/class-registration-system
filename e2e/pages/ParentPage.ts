import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ParentPage extends BasePage {
    readonly familyMembersLink: Locator;
    readonly browseClassesLink: Locator;
    readonly enrollmentsLink: Locator;

    constructor(page: Page) {
        super(page);
        this.familyMembersLink = page.getByTestId('nav-link-family-members');
        this.browseClassesLink = page.getByTestId('nav-link-browse-classes');
        this.enrollmentsLink = page.getByTestId('nav-link-enrollments');
    }

    async goToFamilyMembers() {
        await this.familyMembersLink.first().click();
    }

    async goToBrowseClasses() {
        await this.browseClassesLink.first().click();
    }
}
