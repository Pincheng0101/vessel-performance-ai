import { test as base } from '~~/tests/integration/fixtures';

export const test = base.extend({
  loggedInPage: async ({ loggedInPage: baseLoggedInPage, baseURL }, use) => {
    const page = baseLoggedInPage;
    // Visit the playground page
    await page.goto(new URL('playground', baseURL).toString());
    await use(page);
  },
});
