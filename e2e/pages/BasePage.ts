import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
    readonly page: Page;
    readonly sidebar: Locator;
    readonly userMenu: Locator;
    readonly title: Locator;

    constructor(page: Page) {
        this.page = page;
        this.sidebar = page.locator('aside');
        this.userMenu = page.getByTestId('user-menu-button');
        this.title = page.getByRole('heading', { level: 1 });
    }

    async navigateTo(path: string) {
        await this.page.goto(path);
    }

    async clickNavLink(label: string) {
        await this.page.getByRole('link', { name: label }).first().click();
    }

    async signOut() {
        await this.userMenu.click();
        await this.page.getByText(/sign out/i).click();
        await expect(this.page).toHaveURL(/\/login/);
    }

    async expectTitle(text: string | RegExp) {
        await expect(this.title).toHaveText(text);
    }
}
