import McpServerToolBase from './McpServerToolBase';

/**
 * A custom tool definition; carries no inputSchema (only http/lambda/code declare their own).
 */
class McpServerCustomTool extends McpServerToolBase {
  constructor({
    customToolType,
    description,
    name,
  } = {}) {
    super({
      description,
      name,
    });
    this.customToolType = customToolType ?? '';
  }

  get type() {
    return this.customToolType;
  }

  /**
   * @param {McpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      custom_tool_type: resource.customToolType,
      description: resource.description,
      name: resource.name,
    };
  }
}

export default McpServerCustomTool;
