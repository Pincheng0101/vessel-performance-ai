import { test as base } from '@playwright/test';

export const test = base.extend({
  loggedInPage: async ({ page, baseURL }, use) => {
    await page.goto(baseURL);
    await page.waitForURL(new URL('agents', baseURL).toString());
    await use(page);
  },
});

export const hideHeader = async (page) => {
  await page.evaluate(() => {
    document.querySelector('header').style.display = 'none';
  });
};
