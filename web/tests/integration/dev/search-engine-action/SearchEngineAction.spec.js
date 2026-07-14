import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@nuxt/test-utils/playwright';
import { test } from '~~/tests/integration/dev/fixtures';
import { hideHeader } from '~~/tests/integration/fixtures';

/**
 * @import { Page } from '@playwright/test'
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @type {Page}
 */
let page;

/**
 * @param {Page} page
 */
const fillForm = async (page) => {
  // Select the workflow action
  await page.getByLabel('Workflow Actions', { exact: true }).click();
  // Hide the header to ensure all elements are visible
  await hideHeader(page);
  await page.getByLabel('Action', { exact: true }).click();
  await page.getByLabel('Search Engine Action', { exact: true }).click();
  // Wait for the form to be visible
  await page.locator('form').waitFor({ state: 'visible' });
  // Fill the form
  await page.getByLabel('Name', { exact: true }).fill('test_action');
  await page.getByLabel('Search Engine', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_google_search_engine');
  await page.getByLabel('e2e_testing_google_search_engine', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  // Open the modal
  {
    await page.getByLabel('Tune Search Engine', { exact: true }).click();
    await page.getByLabel('Workflow Modal', { exact: true }).getByLabel('Advanced Settings', { exact: true }).click();
    await page.getByLabel('Exact Terms', { exact: true }).fill('Taiwan');
    await page.getByLabel('Exclude Terms', { exact: true }).fill('LinkedIn');
    await page.getByLabel('Close Modal', { exact: true }).click();
  }
  await page.getByLabel('Query Source', { exact: true }).click();
  await page.getByLabel('Custom Query', { exact: true }).click();
  {
    const element = page.getByLabel('Query String', { exact: true });
    await element.clear();
    await element.fill('headquarter.ai');
  }
  await page.getByLabel('Compact Mode', { exact: true }).check();
  await page.getByLabel('Comment', { exact: true }).fill('test_comment');
  await page.getByLabel('Advanced Action Settings', { exact: true }).click();
  await page.getByLabel('Document Limit', { exact: true }).fill('3');
  await page.getByLabel('Execution Settings', { exact: true }).click();
  await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
  {
    const element = page.getByLabel('State Memory Output Selector', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ search_results: '$.search_results' }));
  }
  await page.getByLabel('Enable Real-time Streaming at Task Start', { exact: true }).check();
  await page.getByLabel('Enable Real-time Streaming at Task End', { exact: true }).check();
  await page.getByLabel('Abort on Error', { exact: true }).uncheck();
  {
    const element = page.getByLabel('Default Output Input Group', { exact: true });
    await element.hover();
    await element.getByLabel('Use JSON', { exact: true }).click();
  }
  {
    const element = page.getByLabel('Default Output', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ search_results: [{ test: 'test_default_output' }] }));
  }
};

test.beforeEach(async ({ loggedInPage }) => {
  page = loggedInPage;
  await fillForm(page);
});

test.describe('SearchEngineAction', () => {
  test('should display the correct definition', async () => {
    await page.getByLabel('Show Definition', { exact: true }).check();
    const actual = await page.locator('[data-aria-label="Definition"]').textContent();
    const expected = fs.readFileSync(path.resolve(__dirname, 'definition.json'), 'utf8');
    expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
  });

  test('should produce the correct output', async () => {
    await page.getByLabel('Test Action', { exact: true }).click();
    {
      const element = page.getByLabel('Workflow Modal', { exact: true });
      await element.scrollIntoViewIfNeeded();
    }
    await page.getByLabel('Start', { exact: true }).click();
    await page.getByLabel('Status', { exact: true }).locator('text=Succeeded').waitFor();
    await page.getByLabel('Markdown Viewer', { exact: true }).hover();
    await page.getByLabel('View as JSON', { exact: true }).click();
    const actual = await page.locator('[data-aria-label="Action Output"]').textContent();
    const parsedOutput = JSON.parse(actual);
    // The actual output is dynamic, we just need to check the structure
    expect(parsedOutput.action_type).toBe('search_engine_action');
    expect(parsedOutput.errors).toBeNull();
    expect(parsedOutput.search_results.length).toBeGreaterThan(0);
  });
});
