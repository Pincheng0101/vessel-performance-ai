import McpServerToolBase from './McpServerToolBase';

/**
 * A tool exposed by an MCP server at runtime; adds the inputSchema call contract.
 */
class McpServerTool extends McpServerToolBase {
  constructor({
    description,
    inputSchema,
    name,
  } = {}) {
    super({
      description,
      name,
    });
    // Set fields explicitly to prevent backend default values
    this.inputSchema = inputSchema ?? null;
  }
}

export default McpServerTool;
