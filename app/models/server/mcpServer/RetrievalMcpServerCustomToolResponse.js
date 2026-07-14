import RetrievalMcpServerCustomTool from './RetrievalMcpServerCustomTool';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RetrievalMcpServerCustomToolResponse extends RetrievalMcpServerCustomTool {
  constructor({
    custom_tool_type,
    data_fields,
    description,
    knowledge_base_id,
    name,
    ranker_id,
    retriever_ids,
  } = {}) {
    super({
      customToolType: custom_tool_type,
      dataFields: data_fields,
      description,
      knowledgeBaseId: knowledge_base_id,
      name,
      rankerId: ranker_id,
      retrieverIds: retriever_ids,
    });
  }
}

export default RetrievalMcpServerCustomToolResponse;
