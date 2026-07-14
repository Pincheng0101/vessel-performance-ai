import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';
import AgentToolAgent from './AgentToolAgent';
import AgentToolApi from './AgentToolApi';
import AgentToolAthena from './AgentToolAthena';
import AgentToolHttpClient from './AgentToolHttpClient';
import AgentToolLambda from './AgentToolLambda';
import AgentToolMcpServer from './AgentToolMcpServer';
import AgentToolMySqlClient from './AgentToolMySqlClient';
import AgentToolOpenSearchClient from './AgentToolOpenSearchClient';
import AgentToolRetrieval from './AgentToolRetrieval';
import AgentToolSearchEngine from './AgentToolSearchEngine';
import AgentToolSkill from './AgentToolSkill';
import AgentToolWorkflow from './AgentToolWorkflow';

class AgentToolFactory {
  /**
   * @param {AgentTool} payload
   */
  static create(payload) {
    switch (payload.toolType) {
      case AgentConstant.ToolType.MCP_SERVER.value:
        return new AgentToolMcpServer(payload);
      case AgentConstant.ToolType.RETRIEVAL.value:
        return new AgentToolRetrieval(payload);
      case AgentConstant.ToolType.SEARCH_ENGINE.value:
        return new AgentToolSearchEngine(payload);
      case AgentConstant.ToolType.SKILL.value:
        return new AgentToolSkill(payload);
      case AgentConstant.ToolType.WORKFLOW.value:
        return new AgentToolWorkflow(payload);
      case AgentConstant.ToolType.LAMBDA.value:
        return new AgentToolLambda(payload);
      case AgentConstant.ToolType.API.value:
        return new AgentToolApi(payload);
      case AgentConstant.ToolType.HTTP_CLIENT.value:
        return new AgentToolHttpClient(payload);
      case AgentConstant.ToolType.AGENT.value:
        return new AgentToolAgent(payload);
      case AgentConstant.ToolType.ATHENA_CLIENT.value:
        return new AgentToolAthena(payload);
      case AgentConstant.ToolType.OPENSEARCH_CLIENT.value:
        return new AgentToolOpenSearchClient(payload);
      case AgentConstant.ToolType.MYSQL_CLIENT.value:
        return new AgentToolMySqlClient(payload);
      default:
        return new AgentTool(payload);
    }
  }

  /**
   * @param {AgentTool} tool
   */
  static toRequestPayload(tool) {
    switch (tool.toolType) {
      case AgentConstant.ToolType.MCP_SERVER.value:
        return AgentToolMcpServer.toRequestPayload(tool);
      case AgentConstant.ToolType.RETRIEVAL.value:
        return AgentToolRetrieval.toRequestPayload(tool);
      case AgentConstant.ToolType.SEARCH_ENGINE.value:
        return AgentToolSearchEngine.toRequestPayload(tool);
      case AgentConstant.ToolType.SKILL.value:
        return AgentToolSkill.toRequestPayload(tool);
      case AgentConstant.ToolType.WORKFLOW.value:
        return AgentToolWorkflow.toRequestPayload(tool);
      case AgentConstant.ToolType.LAMBDA.value:
        return AgentToolLambda.toRequestPayload(tool);
      case AgentConstant.ToolType.API.value:
        return AgentToolApi.toRequestPayload(tool);
      case AgentConstant.ToolType.HTTP_CLIENT.value:
        return AgentToolHttpClient.toRequestPayload(tool);
      case AgentConstant.ToolType.AGENT.value:
        return AgentToolAgent.toRequestPayload(tool);
      case AgentConstant.ToolType.ATHENA_CLIENT.value:
        return AgentToolAthena.toRequestPayload(tool);
      case AgentConstant.ToolType.OPENSEARCH_CLIENT.value:
        return AgentToolOpenSearchClient.toRequestPayload(tool);
      case AgentConstant.ToolType.MYSQL_CLIENT.value:
        return AgentToolMySqlClient.toRequestPayload(tool);
      default:
        return AgentTool.toRequestPayload(tool);
    }
  }
}

export default AgentToolFactory;
