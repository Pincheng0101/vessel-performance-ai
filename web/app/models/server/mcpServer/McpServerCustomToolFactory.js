import { McpServerConstant } from '~/constants';
import AgentMcpServerCustomTool from './AgentMcpServerCustomTool';
import AthenaMcpServerCustomTool from './AthenaMcpServerCustomTool';
import CodeMcpServerCustomTool from './CodeMcpServerCustomTool';
import HttpMcpServerCustomTool from './HttpMcpServerCustomTool';
import LambdaMcpServerCustomTool from './LambdaMcpServerCustomTool';
import McpServerCustomTool from './McpServerCustomTool';
import MySqlMcpServerCustomTool from './MySqlMcpServerCustomTool';
import OpenSearchMcpServerCustomTool from './OpenSearchMcpServerCustomTool';
import RetrievalMcpServerCustomTool from './RetrievalMcpServerCustomTool';

class McpServerCustomToolFactory {
  /**
   * @param {McpServerCustomTool} payload
   */
  static create(payload) {
    switch (payload.customToolType) {
      case McpServerConstant.CustomToolType.AGENT.value:
        return new AgentMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.ATHENA.value:
        return new AthenaMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.CODE.value:
        return new CodeMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.HTTP.value:
        return new HttpMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.LAMBDA.value:
        return new LambdaMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.MYSQL.value:
        return new MySqlMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.OPENSEARCH.value:
        return new OpenSearchMcpServerCustomTool(payload);
      case McpServerConstant.CustomToolType.RETRIEVAL.value:
        return new RetrievalMcpServerCustomTool(payload);
      default:
        return new McpServerCustomTool(payload);
    }
  }

  /**
   * @param {McpServerCustomTool} resource
   */
  static toRequestPayload(resource) {
    switch (resource.customToolType) {
      case McpServerConstant.CustomToolType.AGENT.value:
        return AgentMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.ATHENA.value:
        return AthenaMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.CODE.value:
        return CodeMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.HTTP.value:
        return HttpMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.LAMBDA.value:
        return LambdaMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.MYSQL.value:
        return MySqlMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.OPENSEARCH.value:
        return OpenSearchMcpServerCustomTool.toRequestPayload(resource);
      case McpServerConstant.CustomToolType.RETRIEVAL.value:
        return RetrievalMcpServerCustomTool.toRequestPayload(resource);
      default:
        return McpServerCustomTool.toRequestPayload(resource);
    }
  }
}

export default McpServerCustomToolFactory;
