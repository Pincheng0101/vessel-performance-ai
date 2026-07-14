import { AgentConstant } from '~/constants';
import AgentToolAgentResponse from './AgentToolAgentResponse';
import AgentToolApiResponse from './AgentToolApiResponse';
import AgentToolAthenaResponse from './AgentToolAthenaResponse';
import AgentToolHttpClientResponse from './AgentToolHttpClientResponse';
import AgentToolLambdaResponse from './AgentToolLambdaResponse';
import AgentToolMcpServerResponse from './AgentToolMcpServerResponse';
import AgentToolMySqlClientResponse from './AgentToolMySqlClientResponse';
import AgentToolOpenSearchClientResponse from './AgentToolOpenSearchClientResponse';
import AgentToolResponse from './AgentToolResponse';
import AgentToolRetrievalResponse from './AgentToolRetrievalResponse';
import AgentToolSearchEngineResponse from './AgentToolSearchEngineResponse';
import AgentToolSkillResponse from './AgentToolSkillResponse';
import AgentToolWorkflowResponse from './AgentToolWorkflowResponse';

class AgentToolResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.tool_type
   */
  static create(payload) {
    switch (payload.tool_type) {
      case AgentConstant.ToolType.MCP_SERVER.value:
        return new AgentToolMcpServerResponse(payload);
      case AgentConstant.ToolType.RETRIEVAL.value:
        return new AgentToolRetrievalResponse(payload);
      case AgentConstant.ToolType.SEARCH_ENGINE.value:
        return new AgentToolSearchEngineResponse(payload);
      case AgentConstant.ToolType.SKILL.value:
        return new AgentToolSkillResponse(payload);
      case AgentConstant.ToolType.WORKFLOW.value:
        return new AgentToolWorkflowResponse(payload);
      case AgentConstant.ToolType.LAMBDA.value:
        return new AgentToolLambdaResponse(payload);
      case AgentConstant.ToolType.API.value:
        return new AgentToolApiResponse(payload);
      case AgentConstant.ToolType.HTTP_CLIENT.value:
        return new AgentToolHttpClientResponse(payload);
      case AgentConstant.ToolType.AGENT.value:
        return new AgentToolAgentResponse(payload);
      case AgentConstant.ToolType.ATHENA_CLIENT.value:
        return new AgentToolAthenaResponse(payload);
      case AgentConstant.ToolType.OPENSEARCH_CLIENT.value:
        return new AgentToolOpenSearchClientResponse(payload);
      case AgentConstant.ToolType.MYSQL_CLIENT.value:
        return new AgentToolMySqlClientResponse(payload);
      default:
        return new AgentToolResponse(payload);
    }
  }
}

export default AgentToolResponseFactory;
