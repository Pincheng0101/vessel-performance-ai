import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolHttpClient extends AgentTool {
  constructor({
    connectorId,
    description,
    displayName,
    headers,
    name,
    tags,
    timeout,
    toolType = AgentConstant.ToolType.HTTP_CLIENT.value,
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
    this.connectorId = connectorId;
    this.headers = headers;
    this.timeout = timeout ?? AgentConstant.DefaultParams.REQUEST_TIMEOUT.default;
  }

  /**
   * @param {AgentToolHttpClient} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      connector_id: tool.connectorId,
      headers: tool.headers,
      timeout: tool.timeout,
    };
  }
}

export default AgentToolHttpClient;
