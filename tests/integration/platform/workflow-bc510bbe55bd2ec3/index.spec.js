import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test } from '~~/tests/integration/platform/fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('workflow should run successfully', async ({ workflowTest }) => {
  // Increase the timeout for this test
  test.setTimeout(300 * 1000);

  const id = path.basename(__dirname);
  const input = fs.readFileSync(path.join(__dirname, 'input.json'), 'utf8');
  await workflowTest.runWorkflow(id, { input });
});
