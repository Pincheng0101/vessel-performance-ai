import KnowledgeBase from './KnowledgeBase';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class KnowledgeBaseResponse extends KnowledgeBase {
  constructor({
    data_fields,
    knowledge_base_id,
    knowledge_base_name,
    loader_id,
    opensearch_index_name,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      dataFields: data_fields,
      knowledgeBaseId: knowledge_base_id,
      knowledgeBaseName: knowledge_base_name,
      loaderId: loader_id,
      opensearchIndexName: opensearch_index_name,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default KnowledgeBaseResponse;
