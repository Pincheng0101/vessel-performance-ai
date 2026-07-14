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
  await page.getByLabel('Structured LLM Action', { exact: true }).click();
  // Wait for the form to be visible
  await page.locator('form').waitFor({ state: 'visible' });
  // Fill the form
  await page.getByLabel('Name', { exact: true }).fill('test_action');
  await page.getByLabel('LLM', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_anthropic_llm');
  await page.getByLabel('e2e_testing_anthropic_llm', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  // Open the modal
  {
    await page.getByLabel('Tune LLM', { exact: true }).click();
    await page.getByLabel('System Prompt', { exact: true }).fill('Answer in one sentence.');
    await page.getByLabel('Workflow Modal', { exact: true }).getByLabel('Advanced Settings', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Max Tokens', exact: true }).check();
    await page.getByLabel('Top P', { exact: true }).check();
    await page.getByLabel('Top K', { exact: true }).check();
    await page.getByLabel('Performance Config Latency', { exact: true }).click();
    await page.getByLabel('Standard', { exact: true }).click();
    await page.getByLabel('Close Modal', { exact: true }).click();
  }
  {
    const element = page.getByLabel('Messages Input Group', { exact: true });
    await element.locator('table tbody tr:first-child td:last-child button:has(.mdi-trash-can)').click();
  }
  await page.getByLabel('Messages', { exact: true }).click();
  await page.getByLabel('Create Message Dialog').getByLabel('Role', { exact: true }).click();
  await page.getByLabel('User', { exact: true }).click();
  await page.getByLabel('Contents', { exact: true }).click();
  await page.getByLabel('Create Content Dialog').getByLabel('Name', { exact: true }).fill('test_content_block');
  await page.getByLabel('Type', { exact: true }).click();
  await page.getByLabel('Text', { exact: true }).click();
  await page.getByLabel('Prompt Source', { exact: true }).click();
  await page.getByLabel('Custom Prompt', { exact: true }).click();
  {
    const element = page.getByLabel('Prompt', { exact: true });
    await element.clear();
    await element.fill('Can you cook with taro? Just answer yes or no.');
  }
  await page.getByLabel('Create Content Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Create Message Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  {
    const element = page.getByLabel('JSON Schema Input Group', { exact: true });
    await element.hover();
    await element.getByLabel('Use JSON', { exact: true }).click();
  }
  {
    const element = page.getByLabel('JSON Schema', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] }));
  }
  await page.getByLabel('Comment', { exact: true }).fill('test_comment');
  await page.getByLabel('Advanced Action Settings', { exact: true }).click();
  await page.getByLabel('Guardrail ID', { exact: true }).fill('w9lo2iq8i3br');
  await page.getByLabel('Guardrail Version', { exact: true }).fill('3');
  await page.getByLabel('Fallback LLMs', { exact: true }).click();
  await page.getByLabel('Select Fallback LLM', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_open_ai_llm');
  await page.getByLabel('e2e_testing_open_ai_llm', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Create Fallback LLM Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Allow Retry', { exact: true }).check();
  await page.getByLabel('Execution Settings', { exact: true }).click();
  await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
  {
    const element = page.getByLabel('State Memory Output Selector', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ response: '$.response' }));
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
    await element.fill(JSON.stringify({ response: { answer: 'test_answer' } }));
  }
};

test.beforeEach(async ({ loggedInPage }) => {
  page = loggedInPage;
  await fillForm(page);
});

test.describe('StructuredLlmAction', () => {
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
    delete actualObject.source_llm_id;
    delete actualObject.response.answer;
    delete expectedObject.source_llm_id;
    delete expectedObject.response.answer;
    expect(actualObject).toEqual(expectedObject);
  });
});
