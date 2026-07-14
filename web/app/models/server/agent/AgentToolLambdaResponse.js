import AgentToolLambda from './AgentToolLambda';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolLambdaResponse extends AgentToolLambda {
  constructor({
    base_input_schema,
    description,
    display_name,
    function_name,
    input_schema,
    lambda_function_id,
    name,
    tags,
    track_tool_results,
    tool_type,
  } = {}) {
    super({
      baseInputSchema: base_input_schema,
      description,
      displayName: display_name,
      functionName: function_name,
      inputSchema: input_schema,
      lambdaFunctionId: lambda_function_id,
      name,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolLambdaResponse;
