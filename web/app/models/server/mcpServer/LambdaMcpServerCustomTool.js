import McpServerCustomTool from './McpServerCustomTool';

class LambdaMcpServerCustomTool extends McpServerCustomTool {
  constructor({
    customToolType,
    description,
    inputSchema,
    lambdaFunctionId,
    lambdaFunctionName,
    name,
    payload,
  } = {}) {
    super({
      customToolType,
      description,
      name,
    });
    this.inputSchema = inputSchema ?? null;
    this.lambdaFunctionId = lambdaFunctionId ?? null;
    this.lambdaFunctionName = lambdaFunctionName ?? null;
    this.payload = payload ?? null;
  }

  /**
   * @param {LambdaMcpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      input_schema: resource.inputSchema,
      lambda_function_id: resource.lambdaFunctionId ?? null,
      lambda_function_name: resource.lambdaFunctionName ?? null,
      payload: resource.payload,
    };
  }
}

export default LambdaMcpServerCustomTool;
