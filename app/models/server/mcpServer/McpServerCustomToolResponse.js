import McpServerCustomTool from './McpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class McpServerCustomToolResponse extends McpServerCustomTool {
  constructor({
    custom_tool_type,
    description,
    name,
  } = {}) {
    super({
      customToolType: custom_tool_type,
      description,
      name,
    });
  }
}

export default McpServerCustomToolResponse;
