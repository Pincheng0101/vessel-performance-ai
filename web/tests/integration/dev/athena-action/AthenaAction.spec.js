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
  await page.getByLabel('Athena Action', { exact: true }).click();
  // Wait for the form to be visible
  await page.locator('form').waitFor({ state: 'visible' });
  // Fill the form
  await page.getByLabel('Name', { exact: true }).fill('test_action');
  await page.getByLabel('Connector', { exact: true }).click();
  await page.getByLabel('Search', { exact: true }).fill('e2e-testing-api-aws-connector');
  await page.getByLabel('e2e-testing-api-aws-connector', { exact: true }).click();
  await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
  {
    const element = page.getByLabel('SQL Query', { exact: true });
    await element.clear();
    await element.fill('SELECT\n  model,\n  llm_type,\n  input_tokens,\n  output_tokens\nFROM\n  token_usage');
  }
  await page.getByLabel('Database', { exact: true }).fill('lfe_metering');
  await page.getByLabel('Execution and Output Setting', { exact: true }).click();
  await page.getByLabel('Output Location', { exact: true }).click();
  await page.locator('form').getByLabel('Output Location', { exact: true }).fill('s3://e2e-testing-athena');
  await page.getByLabel('Comment', { exact: true }).fill('test_comment');
  await page.getByLabel('Advanced Action Settings', { exact: true }).click();
  {
    const element = page.getByLabel('Max Rows', { exact: true });
    await element.clear();
    await element.fill('3');
  }
  {
    const element = page.getByLabel('Wait Timeout', { exact: true });
    await element.clear();
    await element.fill('30');
  }
  await page.getByLabel('Execution Settings', { exact: true }).click();
  await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
  {
    const element = page.getByLabel('State Memory Output Selector', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({ rows: '$.rows' }));
  }
  await page.getByLabel('Abort on Error', { exact: true }).uncheck();
  {
    const element = page.getByLabel('Default Output Input Group', { exact: true });
    await element.hover();
    await element.getByLabel('Use JSON', { exact: true }).click();
  }
  {
    const element = page.getByLabel('Default Output', { exact: true });
    await element.clear();
    await element.fill(JSON.stringify({
      columns: ['model', 'llm_type', 'input_tokens', 'output_tokens'],
      rows: [['test_model', 'test_llm_type', '0', '0']],
      query_execution_id: 'test_query_execution_id',
      truncated: false,
    }));
  }
};

test.beforeEach(async ({ loggedInPage }) => {
  page = loggedInPage;
  await fillForm(page);
});

test.describe('AthenaAction', () => {
  test('should display the correct definition', async () => {
    await page.getByLabel('Show Definition', { exact: true }).check();
    const actual = JSON.parse(await page.locator('[data-aria-label="Definition"]').textContent());
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'definition.json'), 'utf8'));

    // Connector IDs vary across environments.
    expect(actual.test_action.Parameters.Payload.connector_id).toMatch(/^connector-/);
    actual.test_action.Parameters.Payload.connector_id = null;
    expect(actual).toEqual(expected);
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

    expect(actualObject.query_execution_id).toBeTruthy();
    expect(actualObject.rows).toHaveLength(3);
    for (const row of actualObject.rows) {
      expect(row).toHaveLength(expectedObject.columns.length);
      expect(row.every(value => value === null || typeof value === 'string')).toBe(true);
    }

    // Query IDs and metering rows vary between executions.
    delete actualObject.query_execution_id;
    delete expectedObject.query_execution_id;
    delete actualObject.rows;
    delete expectedObject.rows;
    expect(actualObject).toEqual(expectedObject);
  });
});
