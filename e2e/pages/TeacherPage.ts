import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TeacherPage extends BasePage {
    readonly classesLink: Locator;
    readonly studentsLink: Locator;

    constructor(page: Page) {
        super(page);
        this.classesLink = page.getByTestId('nav-link-my-classes');
        this.studentsLink = page.getByTestId('nav-link-students');
    }


    async goToClasses() {
        await this.classesLink.first().click();
    }
}
