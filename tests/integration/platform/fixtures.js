import { expect } from '@nuxt/test-utils/playwright';
import { test as base } from '~~/tests/integration/fixtures';

export const test = base.extend({
  workflowTest: async ({ loggedInPage }, use) => {
    let originalWorkflowUrl = null;
    let copiedWorkflowUrl = null;

    const workflowTest = {
      /**
       * Runs a workflow test with the given workflow ID
       *
       * @param {string} workflowId - The ID of the workflow to run
       * @param {Object} [options] - Options for running the workflow
       * @param {string} [options.input] - The input JSON string for the workflow
       */
      runWorkflow: async (workflowId, { input } = {}) => {
        let page = loggedInPage;

        // Navigate to the workflow page
        await page.goto(`/workflows/${workflowId}`);

        // Copy the workflow
        await page.getByLabel('Copy', { exact: true }).click();

        // Fill the name for the copied workflow
        await page.getByLabel('Name', { exact: true }).fill(`${workflowId}-copy-${Date.now()}`);

        // Save the copied workflow
        await page.getByLabel('Save', { exact: true }).click();

        // Store the original workflow URL
        originalWorkflowUrl = page.url();

        // Wait for the new page to open
        const newPage = page.waitForEvent('popup');

        // Click "Run app" button to navigate to the copied workflow
        await page.getByRole('button', { name: 'Run app' }).click();

        // Store the copied workflow URL
        copiedWorkflowUrl = page.url();

        // Switch to the new page
        page = await newPage;

        // Fill the input
        {
          const element = page.getByLabel('Input Input Group', { exact: true });
          await element.hover();
          await element.getByLabel('Use JSON', { exact: true }).click();
        }
        {
          const element = page.getByLabel('Input', { exact: true });
          await element.clear();
          await element.fill(input);
        }

        // Hide the header to ensure all elements are visible
        await page.evaluate(() => {
          document.querySelector('header').style.display = 'none';
        });

        // Start and wait for completion
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        {
          const element = page.getByLabel('Status', { exact: true });
          await element.waitFor({ state: 'visible' });
          await element.locator('text=Succeeded').waitFor({ state: 'visible' });
        }

        // View output as JSON
        {
          const element = page.getByLabel('Markdown Viewer', { exact: true }).nth(1);
          await element.hover();
          await element.getByLabel('View as JSON', { exact: true }).click();
        }

        // Verify output
        const output = await page.getByLabel('Output', { exact: true }).textContent();
        expect(output).not.toBe('');
      },

      /**
       * Deletes the copied workflow
       */
      deleteWorkflow: async () => {
        if (originalWorkflowUrl === copiedWorkflowUrl) {
          throw new Error('Original and copied workflow URLs are the same');
        }

        const page = loggedInPage;

        // Navigate to the copied workflow page
        await page.goto(copiedWorkflowUrl);

        // Delete the copied workflow
        await page.getByLabel('Delete', { exact: true }).click();

        // Confirm deletion
        await page.getByLabel('Dialog', { exact: true }).getByRole('button', { name: 'Delete' }).click();

        // Wait for redirect
        await page.waitForURL(/\/workflows$/);
      },
    };

    try {
      await use(workflowTest);
    } finally {
      await workflowTest.deleteWorkflow();
    }
  },
});
