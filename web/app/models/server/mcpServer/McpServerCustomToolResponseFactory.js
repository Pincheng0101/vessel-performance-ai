import { McpServerConstant } from '~/constants';
import AgentMcpServerCustomToolResponse from './AgentMcpServerCustomToolResponse';
import AthenaMcpServerCustomToolResponse from './AthenaMcpServerCustomToolResponse';
import CodeMcpServerCustomToolResponse from './CodeMcpServerCustomToolResponse';
import HttpMcpServerCustomToolResponse from './HttpMcpServerCustomToolResponse';
import LambdaMcpServerCustomToolResponse from './LambdaMcpServerCustomToolResponse';
import McpServerCustomToolResponse from './McpServerCustomToolResponse';
import MySqlMcpServerCustomToolResponse from './MySqlMcpServerCustomToolResponse';
import OpenSearchMcpServerCustomToolResponse from './OpenSearchMcpServerCustomToolResponse';
import RetrievalMcpServerCustomToolResponse from './RetrievalMcpServerCustomToolResponse';

class McpServerCustomToolResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.custom_tool_type
   */
  static create(payload) {
    switch (payload.custom_tool_type) {
      case McpServerConstant.CustomToolType.AGENT.value:
        return new AgentMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.ATHENA.value:
        return new AthenaMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.CODE.value:
        return new CodeMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.HTTP.value:
        return new HttpMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.LAMBDA.value:
        return new LambdaMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.MYSQL.value:
        return new MySqlMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.OPENSEARCH.value:
        return new OpenSearchMcpServerCustomToolResponse(payload);
      case McpServerConstant.CustomToolType.RETRIEVAL.value:
        return new RetrievalMcpServerCustomToolResponse(payload);
      default:
        return new McpServerCustomToolResponse(payload);
    }
  }
}

export default McpServerCustomToolResponseFactory;
