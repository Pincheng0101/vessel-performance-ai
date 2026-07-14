import { AgentConstant, OpenSearchConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolOpenSearchClient extends AgentTool {
  constructor({
    connectorId,
    description,
    displayName,
    isCacheConnection,
    name,
    tags,
    timeout,
    toolType = AgentConstant.ToolType.OPENSEARCH_CLIENT.value,
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
    this.isCacheConnection = isCacheConnection ?? OpenSearchConstant.DefaultParams.IS_CACHE_CONNECTION;
    this.timeout = timeout ?? OpenSearchConstant.DefaultParams.TIMEOUT.default;
  }

  /**
   * @param {AgentToolOpenSearchClient} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      connector_id: tool.connectorId,
      is_cache_connection: tool.isCacheConnection,
      timeout: tool.timeout,
    };
  }
}

export default AgentToolOpenSearchClient;
