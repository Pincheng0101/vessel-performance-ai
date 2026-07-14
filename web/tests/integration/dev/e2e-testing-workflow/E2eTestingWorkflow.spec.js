import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test } from '~~/tests/integration/platform/fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('should copy, run and verify workflow', { tag: '@e2e' }, async ({ workflowTest }) => {
  const workflowId = 'workflow-0e176edeb98e815b';
  const input = fs.readFileSync(path.join(__dirname, 'input.json'), 'utf8');
  await workflowTest.runWorkflow(workflowId, { input });
});
