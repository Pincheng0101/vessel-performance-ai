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

test.describe.serial('Workflow Actions', () => {
  let executionArn = '';

  test.describe('StartSyncWorkflowExecutionAction', () => {
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
      await page.getByLabel('Start Sync Workflow Execution Action', { exact: true }).click();
      // Wait for the form to be visible
      await page.locator('form').waitFor({ state: 'visible' });
      // Fill the form
      await page.getByLabel('Name', { exact: true }).fill('test_action');
      {
        await page.getByLabel('Workflow', { exact: true }).click();
        await page.getByLabel('Search', { exact: true }).fill('e2e_testing_workflow_for_workflow_actions');
        await page.getByLabel('e2e_testing_workflow_for_workflow_actions', { exact: true }).click();
        await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
      }
      {
        const element = page.getByLabel('Input', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ message: 'e2e_testing_text' }));
      }
      await page.getByLabel('Upload Input to External Memory', { exact: true }).check();
      {
        const element = page.getByLabel('State Memory Input Selector', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ message: '$.message' }));
      }
      await page.getByLabel('Comment', { exact: true }).fill('test_comment');
      await page.getByLabel('Execution Settings', { exact: true }).click();
      await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
      {
        const element = page.getByLabel('State Memory Output Selector', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ output: '$.output' }));
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
        await element.fill(JSON.stringify({ output: { test: 'test_default_output' } }));
      }
    };

    test.beforeEach(async ({ loggedInPage }) => {
      page = loggedInPage;
      await fillForm(page);
    });

    test('should display the correct definition', async () => {
      await page.getByLabel('Show Definition', { exact: true }).check();
      const actual = await page.locator('[data-aria-label="Definition"]').textContent();
      const expected = fs.readFileSync(path.resolve(__dirname, 'start-sync-workflow-execution-action/definition.json'), 'utf8');
      expect(JSON.parse(actual)).toEqual(JSON.parse(expected));
    });

    test('should produce the correct output', async () => {
      await page.getByLabel('Test Action', { exact: true }).click();
      {
        const element = page.getByLabel('Workflow Modal', { exact: true });
        await element.scrollIntoViewIfNeeded();
      }
      {
        const element = page.getByLabel('Test Input Input Group', { exact: true });
        await element.hover();
        await element.getByLabel('Use JSON', { exact: true }).click();
      }
      {
        const element = page.getByLabel('Test Input', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ message: 'e2e_testing_text' }));
      }
      await page.getByLabel('Start', { exact: true }).click();
      await page.getByLabel('Status', { exact: true }).locator('text=Succeeded').waitFor();
      await page.getByLabel('Markdown Viewer', { exact: true }).hover();
      await page.getByLabel('View as JSON', { exact: true }).click();
      const actual = await page.locator('[data-aria-label="Action Output"]').textContent();
      const expected = fs.readFileSync(path.resolve(__dirname, 'start-sync-workflow-execution-action/action-output.json'), 'utf8');
      const actualObject = JSON.parse(actual);
      const expectedObject = JSON.parse(expected);
      expect(actualObject.output).toBeTruthy();

      // Save the actual execution ARN to the shared variable
      executionArn = actualObject.execution_arn;

      // Remove volatile fields before comparison
      actualObject.execution_arn = actualObject.execution_arn.substring(0, actualObject.execution_arn.lastIndexOf(':'));
      expectedObject.execution_arn = expectedObject.execution_arn.substring(0, expectedObject.execution_arn.lastIndexOf(':'));

      // Remove volatile fields before comparison
      delete actualObject.output._id;
      delete actualObject.output._lfe_system;
      delete actualObject.output.external_memory_id;
      delete expectedObject.output._id;
      delete expectedObject.output._lfe_system;
      delete expectedObject.output.external_memory_id;
      expect(actualObject).toEqual(expectedObject);
    });
  });

  test.describe('StartWorkflowExecutionAction', () => {
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
      await page.getByLabel('Start Workflow Execution Action', { exact: true }).click();
      // Wait for the form to be visible
      await page.locator('form').waitFor({ state: 'visible' });
      // Fill the form
      await page.getByLabel('Name', { exact: true }).fill('test_action');
      {
        await page.getByLabel('Workflow', { exact: true }).click();
        await page.getByLabel('Search', { exact: true }).fill('e2e_testing_workflow_for_workflow_actions');
        await page.getByLabel('e2e_testing_workflow_for_workflow_actions', { exact: true }).click();
        await page.getByLabel('Resource Dialog', { exact: true }).getByLabel('Save', { exact: true }).click();
      }
      {
        const element = page.getByLabel('Input', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ message: 'e2e_testing_text' }));
      }
      await page.getByLabel('Upload Input to External Memory', { exact: true }).check();
      {
        const element = page.getByLabel('State Memory Input Selector', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ message: '$.message' }));
      }
      await page.getByLabel('Comment', { exact: true }).fill('test_comment');
      await page.getByLabel('Execution Settings', { exact: true }).click();
      await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
      {
        const element = page.getByLabel('State Memory Output Selector', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ executionArn: '$.execution_arn' }));
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
        await element.fill(JSON.stringify({ execution_arn: 'arn:aws:states:us-west-2:123456789012:execution:test-execution-arn' }));
      }
    };

    test.beforeEach(async ({ loggedInPage }) => {
      page = loggedInPage;
      await fillForm(page);
    });

    test('should display the correct definition', async () => {
      await page.getByLabel('Show Definition', { exact: true }).check();
      const actual = await page.locator('[data-aria-label="Definition"]').textContent();
      const expected = fs.readFileSync(path.resolve(__dirname, 'start-workflow-execution-action/definition.json'), 'utf8');
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
      const expected = fs.readFileSync(path.resolve(__dirname, 'start-workflow-execution-action/action-output.json'), 'utf8');
      const actualObject = JSON.parse(actual);
      const expectedObject = JSON.parse(expected);
      expect(actualObject.execution_arn).toBeTruthy();

      // Save the actual execution ARN to the shared variable
      executionArn = actualObject.execution_arn;

      // Remove volatile fields before comparison
      actualObject.execution_arn = actualObject.execution_arn.substring(0, actualObject.execution_arn.lastIndexOf(':'));
      expectedObject.execution_arn = expectedObject.execution_arn.substring(0, expectedObject.execution_arn.lastIndexOf(':'));
      expect(actualObject).toEqual(expectedObject);
    });
  });

  test.describe('DescribeWorkflowExecutionAction', { tag: '@e2e' }, () => {
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
      await page.getByLabel('Describe Workflow Execution Action', { exact: true }).click();
      // Wait for the form to be visible
      await page.locator('form').waitFor({ state: 'visible' });
      // Fill the form
      await page.getByLabel('Name', { exact: true }).fill('test_action');
      await page.getByLabel('Execution ARN', { exact: true }).fill(executionArn);
      await page.getByLabel('Comment', { exact: true }).fill('test_comment');
      await page.getByLabel('Execution Settings', { exact: true }).click();
      await page.getByLabel('Upload Output to External Memory', { exact: true }).check();
      {
        const element = page.getByLabel('State Memory Output Selector', { exact: true });
        await element.clear();
        await element.fill(JSON.stringify({ status: '$.status' }));
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
        await element.fill(JSON.stringify({ status: 'SUCCEEDED', output: { message: 'test_default_output' } }));
      }
    };

    test.beforeEach(async ({ loggedInPage }) => {
      page = loggedInPage;

      // Check that we have an execution ARN from the previous test
      if (!executionArn) {
        throw new Error('Missing execution ARN.');
      }

      await fillForm(page);
    });

    test('should display the correct definition', async () => {
      await page.getByLabel('Show Definition', { exact: true }).check();
      const actual = await page.locator('[data-aria-label="Definition"]').textContent();
      const expected = fs.readFileSync(path.resolve(__dirname, 'describe-workflow-execution-action/definition.json'), 'utf8');
      const expectedObject = JSON.parse(expected);
      expectedObject.test_action.Parameters.Payload.execution_arn = executionArn;
      expect(JSON.parse(actual)).toEqual(expectedObject);
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
      const expected = fs.readFileSync(path.resolve(__dirname, 'describe-workflow-execution-action/action-output.json'), 'utf8');
      const actualObject = JSON.parse(actual);
      const expectedObject = JSON.parse(expected);

      // Remove volatile fields before comparison
      delete actualObject.output._lfe_system;
      delete actualObject.output.external_memory_id;
      delete expectedObject.output._lfe_system;
      delete expectedObject.output.external_memory_id;
      expect(actualObject).toEqual(expectedObject);
    });
  });
});
