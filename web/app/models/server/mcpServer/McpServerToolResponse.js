import McpServerTool from './McpServerTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerToolResponse extends McpServerTool {
  constructor({
    description,
    input_schema,
    name,
  } = {}) {
    super({
      description,
      inputSchema: input_schema,
      name,
    });
  }
}

export default McpServerToolResponse;
