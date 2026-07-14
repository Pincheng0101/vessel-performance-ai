import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolApi extends AgentTool {
  constructor({
    body,
    connectorId,
    description,
    displayName,
    headers,
    inputSchema,
    method,
    name,
    params,
    tags,
    timeout,
    toolType = AgentConstant.ToolType.API.value,
    trackToolResults,
    url,
  } = {}) {
    super({
      description,
      displayName,
      name,
      tags,
      toolType,
      trackToolResults,
    });
    this.body = body;
    this.connectorId = connectorId;
    this.headers = headers;
    this.inputSchema = inputSchema;
    this.method = method;
    this.params = params;
    this.timeout = timeout ?? AgentConstant.DefaultParams.REQUEST_TIMEOUT.default;
    this.url = url;
  }

  /**
   * @param {AgentToolApi} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      body: tool.body,
      connector_id: tool.connectorId,
      headers: tool.headers,
      input_schema: tool.inputSchema,
      method: tool.method,
      params: tool.params,
      timeout: tool.timeout,
      url: tool.url,
    };
  }
}

export default AgentToolApi;
