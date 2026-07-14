import { chromium } from '@playwright/test';
import 'dotenv/config';

const authFile = 'playwright/.auth/user.json';

async function globalSetup() {
  const baseURL = 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login
  await page.goto(baseURL);

  // Switch the locale to English
  await page.getByLabel('Switch Locale', { exact: true }).click();
  await page.getByLabel('English', { exact: true }).click();

  {
    const element = page.getByRole('button', { name: 'Continue' });
    await element.waitFor({ state: 'visible' });
    await element.click();
  }
  {
    const element = page.getByRole('textbox', { name: 'Username' });
    await element.waitFor({ state: 'visible' });
    await element.click();
    await element.fill('');
    await page.keyboard.type(process.env.E2E_TESTER_USERNAME);
  }
  {
    const element = page.getByRole('button', { name: 'Next' });
    await element.waitFor({ state: 'visible' });
    await element.click();
  }
  {
    const element = page.getByRole('textbox', { name: 'Password' });
    await element.waitFor({ state: 'visible' });
    await element.click();
    await element.fill('');
    await page.keyboard.type(process.env.E2E_TESTER_PASSWORD);
  }
  {
    const element = page.getByRole('button', { name: 'Continue' });
    await element.waitFor({ state: 'visible' });
    await element.click();
  }

  // Wait for the agents page to load
  await page.waitForURL(new URL('agents', baseURL).toString());

  // Save authentication state
  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
