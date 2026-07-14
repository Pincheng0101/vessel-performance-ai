import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolSearchEngine extends AgentTool {
  constructor({
    description,
    displayName,
    name,
    searchEngineId,
    tags,
    toolType = AgentConstant.ToolType.SEARCH_ENGINE.value,
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
    this.searchEngineId = searchEngineId;
  }

  /**
   * @param {AgentToolSearchEngine} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      search_engine_id: tool.searchEngineId,
    };
  }
}

export default AgentToolSearchEngine;
