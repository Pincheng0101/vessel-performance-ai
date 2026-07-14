import { expect } from '@nuxt/test-utils/playwright';
import { test as base } from '~~/tests/integration/fixtures';

export const test = base.extend({
  agentBuilderTest: async ({ loggedInPage: baseLoggedInPage, baseURL }, use) => {
    let agentUrl = null;

    const agentBuilderTest = {
      /**
       * Navigate to the agent builder page
       */
      navigateToAgentBuilder: async () => {
        const page = baseLoggedInPage;
        await page.goto(new URL('quick-start/agents/create', baseURL).toString());
      },

      /**
       * Fill in Step 1: Agent role
       * @param {Object} params - Agent role parameters
       * @param {string} params.agentName - The name of the agent
       * @param {string} params.prompt - The agent prompt
       */
      fillAgentRole: async ({ agentName, prompt }) => {
        const page = baseLoggedInPage;

        await page.getByLabel('Name', { exact: true }).fill(agentName);
        await page.getByLabel('Prompt', { exact: true }).fill(prompt);
      },

      /**
       * Proceed to the next step
       */
      goToNextStep: async () => {
        const page = baseLoggedInPage;
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      },

      /**
       * Upload files in Step 2: Knowledge integration
       * @param {string[]} filePaths - Array of file paths to upload
       */
      uploadFiles: async (filePaths) => {
        const page = baseLoggedInPage;
        const fileInput = page.locator('input[type="file"]');

        // Set files on the hidden input - this will trigger the file upload
        await fileInput.setInputFiles(filePaths);
      },

      /**
       * Create the agent and wait for completion
       */
      createAgent: async () => {
        const page = baseLoggedInPage;

        // Click the create button
        await page.getByRole('button', { name: 'Create', exact: true }).click();

        // Wait for the success page to show "Start a conversation" button
        // This indicates all resources have been created
        const successButton = page.getByRole('button', { name: 'Start a conversation', exact: true });
        await successButton.waitFor({ state: 'visible' });

        // Click the "Start a conversation" button to navigate to the agent page
        await successButton.click();

        // Wait for navigation to agent page
        await page.waitForURL(/\/agents\/agent-[a-zA-Z0-9]+\/chat$/);

        // Store the agent URL for later cleanup
        const agentChatUrl = page.url();
        const agentIdMatch = agentChatUrl.match(/\/agents\/(agent-[a-zA-Z0-9]+)\/chat$/);
        const agentId = agentIdMatch ? agentIdMatch[1] : null;
        agentUrl = agentId ? `${baseURL}/agents/${agentId}` : null;
      },

      /**
       * Delete all created resources via UI
       * First stops any running sync jobs, then deletes the agent with all dependencies
       */
      cleanupResources: async () => {
        if (!agentUrl) {
          return;
        }

        const page = baseLoggedInPage;

        try {
          // Navigate to the agent page with dependencies tab
          await page.goto(`${agentUrl}?tab=dependencies`);

          // Find and click the loader link (opens in new tab)
          const loaderLink = page.locator('a[href*="/loaders/"]').first();
          await loaderLink.waitFor({ state: 'visible' });

          // Wait for another new page to open
          const [loaderPage] = await Promise.all([
            page.context().waitForEvent('page'),
            loaderLink.click(),
          ]);
          await loaderPage.waitForLoadState();

          // Navigate to sync jobs tab using URL parameter
          const loaderUrl = loaderPage.url();
          await loaderPage.goto(`${loaderUrl}?tab=sync-jobs`);

          // Find the running sync job in the list and click to enter its page
          const runningJobRow = loaderPage.locator('tr:has-text("Running")').first();
          await runningJobRow.waitFor({ state: 'visible' });
          // Click on the sync job link to enter its detail page
          const syncJobLink = runningJobRow.locator('a[href*="/sync-jobs/"]').first();
          await syncJobLink.waitFor({ state: 'visible' });
          await syncJobLink.click();
          await loaderPage.waitForLoadState();

          // Find and click the Stop button on the sync job page
          const stopButton = loaderPage.getByLabel('Stop sync job', { exact: true });
          await stopButton.waitFor({ state: 'visible' });
          await stopButton.click();
          const status = await loaderPage.getByLabel('Status', { exact: true });
          await expect(status).toHaveText('Aborted', { timeout: 5 * 1000 });

          // Close loader page
          await loaderPage.close();

          // Navigate back to agent page
          await page.goto(agentUrl);

          // Click the delete button
          await page.getByLabel('Delete', { exact: true }).click();

          // Enable "Delete Dependencies" option in the dialog
          await page.getByLabel('Delete Dependencies', { exact: true }).check();

          // Confirm deletion
          await page.getByLabel('Dialog', { exact: true }).getByRole('button', { name: 'Delete' }).click();
          await page.getByLabel('Dialog', { exact: true }).getByRole('button', { name: 'OK' }).click();

          // Wait for redirect to agents list
          await page.waitForURL(/\/agents$/);
        } catch (error) {
          console.warn(`Failed to delete agent via UI: ${error.message}`);
        }
      },
    };

    try {
      await use(agentBuilderTest);
    } finally {
      await agentBuilderTest.cleanupResources();
    }
  },
});
