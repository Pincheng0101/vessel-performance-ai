import LambdaMcpServerCustomTool from './LambdaMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class LambdaMcpServerCustomToolResponse extends LambdaMcpServerCustomTool {
  constructor({
    custom_tool_type,
    description,
    input_schema,
    lambda_function_id,
    lambda_function_name,
    name,
    payload,
  } = {}) {
    super({
      customToolType: custom_tool_type,
      description,
      inputSchema: input_schema,
      lambdaFunctionId: lambda_function_id,
      lambdaFunctionName: lambda_function_name,
      name,
      payload,
    });
  }
}

export default LambdaMcpServerCustomToolResponse;
