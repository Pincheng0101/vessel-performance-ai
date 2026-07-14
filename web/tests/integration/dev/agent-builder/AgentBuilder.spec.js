import path from 'path';
import { fileURLToPath } from 'url';
import { test } from '~~/tests/integration/dev/agent-builder/fixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('AgentBuilder', () => {
  test('should create an agent with all resources and clean up after', { tag: '@e2e' }, async ({ agentBuilderTest }) => {
    // Step 0: Navigate to agent builder
    await agentBuilderTest.navigateToAgentBuilder();

    // Step 1: Fill agent role
    const timestamp = Date.now();
    const agentName = `test_agent_${timestamp}`;
    const prompt = 'An AI assistant that helps answer questions about artificial intelligence and machine learning concepts.';

    await agentBuilderTest.fillAgentRole({
      agentName,
      prompt,
    });

    // Proceed to next step
    await agentBuilderTest.goToNextStep();

    // Step 2: Upload knowledge base files
    const testFilePath = path.resolve(__dirname, 'test-document.txt');

    // Upload files
    await agentBuilderTest.uploadFiles([testFilePath]);

    // Step 3: Create the agent
    await agentBuilderTest.createAgent();

    // Note: Resource cleanup will happen automatically in the fixture's finally block
  });
});
