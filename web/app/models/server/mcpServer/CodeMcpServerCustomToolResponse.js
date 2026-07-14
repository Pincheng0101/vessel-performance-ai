import CodeMcpServerCustomTool from './CodeMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class CodeMcpServerCustomToolResponse extends CodeMcpServerCustomTool {
  constructor({
    code,
    custom_tool_type,
    description,
    input_schema,
    name,
  } = {}) {
    super({
      code,
      customToolType: custom_tool_type,
      description,
      inputSchema: input_schema,
      name,
    });
  }
}

export default CodeMcpServerCustomToolResponse;
