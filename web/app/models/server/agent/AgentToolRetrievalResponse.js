import AgentToolRetrieval from './AgentToolRetrieval';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AgentToolRetrievalResponse extends AgentToolRetrieval {
  constructor({
    data_fields,
    description,
    display_name,
    knowledge_base_id,
    name,
    ranker_id,
    retriever_ids,
    tags,
    tool_type,
    track_tool_results,
  } = {}) {
    super({
      dataFields: data_fields,
      description,
      displayName: display_name,
      knowledgeBaseId: knowledge_base_id,
      name,
      rankerId: ranker_id,
      retrieverIds: retriever_ids,
      tags,
      toolType: tool_type,
      trackToolResults: track_tool_results,
    });
  }
}

export default AgentToolRetrievalResponse;
