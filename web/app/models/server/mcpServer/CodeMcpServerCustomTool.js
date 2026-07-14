import { McpServerConstant } from '~/constants';
import McpServerCustomTool from './McpServerCustomTool';

class CodeMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    code,
    customToolType,
    description,
    inputSchema,
    name,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.code = code ?? McpServerConstant.DefaultParams.CODE;
    this.inputSchema = inputSchema ?? null;
  }

  /**
   * @param {CodeMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      code: resource.code,
      input_schema: resource.inputSchema,
    };
  }
}

export default CodeMcpServerCustomTool;
