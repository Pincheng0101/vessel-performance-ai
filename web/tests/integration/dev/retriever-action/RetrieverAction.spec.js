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
  await page.getByLabel('Retriever Action', { exact: true }).click();
  // Wait for the form to be visible
  await page.locator('form').waitFor({ state: 'visible' });
  // Fill the form
  await page.getByLabel('Name', { exact: true }).fill('test_action');
  await page.getByLabel('Retriever', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_embedding_for_retriever_and_retrieval_action');
  await page.getByLabel('e2e_testing_embedding_for_retriever_and_retrieval_action', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Knowledge Base', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_knowledge_base_for_retriever_and_retrieval_action');
  await page.getByLabel('e2e_testing_knowledge_base_for_retriever_and_retrieval_action', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Query Source', { exact: true }).click();
  await page.getByLabel('Custom Query', { exact: true }).click();
  {
    const element = page.getByLabel('Query String', { exact: true });
    await element.clear();
    await element.fill('Which fruits are rich in nutrients?');
  }
  await page.getByLabel('Comment', { exact: true }).fill('test_comment');
  await page.getByLabel('Advanced Action Settings', { exact: true }).click();
  {
    const element = page.getByLabel('Field Mappings', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ retriever_chunk: 'retriever_chunk' }));
  }
  await page.getByLabel('Document Limit', { exact: true }).fill('15');
  await page.getByLabel('Execution Settings', { exact: true }).click();
  await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
  {
    const element = page.getByLabel('State Memory Output Selector', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ docs: '$.docs' }));
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
    await element.fill(JSON.stringify({ docs: [{ test: 'test_default_output' }] }));
  }
};

test.beforeEach(async ({ loggedInPage }) => {
  page = loggedInPage;
  await fillForm(page);
});

test.describe('RetrieverAction', () => {
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
    const expected = fs.readFileSync(path.resolve(__dirname, 'action-output.json'), 'utf8');
    const actualObject = JSON.parse(actual);
    const expectedObject = JSON.parse(expected);

    // Remove volatile fields before comparison
    actualObject.docs.forEach((doc) => {
      delete doc._score;
    });
    expectedObject.docs.forEach((doc) => {
      delete doc._score;
    });
    expect(actualObject).toEqual(expectedObject);
  });
});
