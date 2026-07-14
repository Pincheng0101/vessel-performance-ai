import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolLambda extends AgentTool {
  constructor({
    baseInputSchema,
    description,
    displayName,
    functionName,
    inputSchema,
    lambdaFunctionId,
    name,
    tags,
    toolType = AgentConstant.ToolType.LAMBDA.value,
    trackToolResults,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.lambdaFunctionId = lambdaFunctionId ?? null;
    this.functionName = functionName;
    this.inputSchema = inputSchema ?? null;
    this.baseInputSchema = baseInputSchema ?? null;
  }

  /**
   * @param {AgentToolLambda} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      input_schema: tool.inputSchema,
      base_input_schema: tool.baseInputSchema,
      lambda_function_id: tool.lambdaFunctionId ?? null,
      function_name: tool.functionName ?? null,
    };
  }
}

export default AgentToolLambda;
