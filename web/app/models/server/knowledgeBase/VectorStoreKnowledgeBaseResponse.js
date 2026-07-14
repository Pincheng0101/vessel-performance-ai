import VectorStoreKnowledgeBase from './VectorStoreKnowledgeBase';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class VectorStoreKnowledgeBaseResponse extends VectorStoreKnowledgeBase {
  constructor({
    data_fields,
    knowledge_base_id,
    knowledge_base_name,
    knowledge_base_type,
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
      knowledgeBaseType: knowledge_base_type,
      loaderId: loader_id,
      opensearchIndexName: opensearch_index_name,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default VectorStoreKnowledgeBaseResponse;
