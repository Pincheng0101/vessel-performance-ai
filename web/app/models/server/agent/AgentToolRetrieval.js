import { AgentConstant } from '~/constants';
import AgentTool from './AgentTool';

class AgentToolRetrieval extends AgentTool {
  constructor({
    dataFields,
    description,
    displayName,
    knowledgeBaseId,
    name,
    rankerId,
    retrieverIds,
    tags,
    toolType = AgentConstant.ToolType.RETRIEVAL.value,
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
    this.dataFields = dataFields;
    this.knowledgeBaseId = knowledgeBaseId;
    this.rankerId = rankerId;
    this.retrieverIds = retrieverIds;
  }

  /**
   * @param {AgentToolRetrieval} tool
   */
  static toRequestPayload(tool) {
    return {
      ...super.toRequestPayload(tool),
      knowledge_base_id: tool.knowledgeBaseId,
      retriever_ids: tool.retrieverIds,
      ranker_id: tool.rankerId,
      data_fields: tool.dataFields,
    };
  }
}

export default AgentToolRetrieval;
