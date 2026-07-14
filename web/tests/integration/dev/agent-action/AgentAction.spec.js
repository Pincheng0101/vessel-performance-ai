import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@nuxt/test-utils/playwright';
import { test } from '~~/tests/integration/dev/fixtures';
import { hideHeader } from '~~/tests/integration/fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {import('@playwright/test').Page} page
 */
const fillForm = async (page) => {
  await page.getByLabel('Workflow Actions', { exact: true }).click();
  await hideHeader(page);
  await page.getByLabel('Action', { exact: true }).click();
  await page.getByLabel('Agent Action', { exact: true }).click();
  await page.locator('form').waitFor({ state: 'visible' });
  await page.getByLabel('Name', { exact: true }).fill('test_action');
  await page.getByLabel('Agent', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_agent_for_agent_action');
  await page.getByLabel('e2e_testing_agent_for_agent_action', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Prompt', { exact: true }).fill('Which {{ item }} is the richest in vitamin C? Answer with only one {{ item }} english name in lowercase.');
  {
    const element = page.getByLabel('Prompt Variables Input Group', { exact: true });
    await element.hover();
    await element.getByLabel('Use JSON', { exact: true }).click();
  }
  {
    const element = page.getByLabel('Prompt Variables', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ item: 'fruit' }));
  }
  await page.getByLabel('Comment', { exact: true }).fill('test_comment');
  await page.getByLabel('Advanced Action Settings', { exact: true }).click();
  await page.getByLabel('Storage', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_storage_agent_action');
  await page.getByLabel('e2e_testing_storage_agent_action', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  await page.getByLabel('Enable Structured Output', { exact: true }).check();
  {
    const element = page.getByLabel('JSON Schema Input Group', { exact: true }).first();
    await element.hover();
    await element.getByLabel('Use JSON', { exact: true }).click();
  }
  {
    const element = page.getByLabel('JSON Schema', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({
      type: 'object',
      properties: {
        highest_vitamin_c_fruit: {
          type: 'string',
        },
      },
      required: ['highest_vitamin_c_fruit'],
    }));
  }
  await page.getByLabel('Structured LLM', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e_testing_anthropic_llm');
  await page.getByLabel('e2e_testing_anthropic_llm', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  {
    const element = page.getByLabel('Max Tool Uses', { exact: true });
    await element.clear();
    await element.fill('5');
  }
  {
    const element = page.getByLabel('WS Idle Timeout', { exact: true });
    await element.clear();
    await element.fill('30');
  }
};

test.beforeEach(async ({ loggedInPage }) => {
  await fillForm(loggedInPage);
});

test.describe('AgentAction', () => {
  test('should display the correct definition', async ({ loggedInPage }) => {
    const page = loggedInPage;
    await page.getByLabel('Show Definition', { exact: true }).check();
    const actualDefinition = JSON.parse(await page.locator('[data-aria-label="Definition"]').textContent());
    const expectedDefinition = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'definition.json'), 'utf8'));
    expect(actualDefinition).toEqual(expectedDefinition);
  });

  test('should produce the correct output', async ({ loggedInPage }) => {
    const page = loggedInPage;
    await page.getByLabel('Test Action', { exact: true }).click();
    await page.getByLabel('Workflow Modal', { exact: true }).scrollIntoViewIfNeeded();
    await page.getByLabel('Start', { exact: true }).click();
    await page.getByLabel('Status', { exact: true }).locator('text=Succeeded').waitFor();
    await page.getByLabel('Markdown Viewer', { exact: true }).hover();
    await page.getByLabel('View as JSON', { exact: true }).click();

    const actualOutput = JSON.parse(await page.locator('[data-aria-label="Action Output"]').textContent());
    const expectedOutput = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'action-output.json'), 'utf8'));

    delete actualOutput.message;
    delete expectedOutput.message;
    delete actualOutput.session_id;
    delete expectedOutput.session_id;
    expect(actualOutput).toEqual(expectedOutput);
  });
});
