import { expect } from '@nuxt/test-utils/playwright';
import { test } from '~~/tests/integration/fixtures';

test('agent chat room should run successfully', { tag: '@e2e' }, async ({ loggedInPage: page }) => {
  await page.goto('/playground/agent-chat-room');

  {
    const element = await page.getByRole('textbox');
    element.fill('你好');
    await element.press('Enter');
  }

  const assistantMessage = page.locator('.assistant-message').first();
  await assistantMessage.locator('[data-status="completed"]').waitFor({ state: 'visible' });

  const output = await assistantMessage.textContent();
  await expect(output).not.toBe('');
});
