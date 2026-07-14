import RetrieverActionExecutionPayload from './RetrieverActionExecutionPayload';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class RetrieverActionExecutionPayloadResponse extends RetrieverActionExecutionPayload {
  constructor({
    field_mappings,
    filter_query,
    knowledge_base_id,
    limit,
    query_string,
    retriever_id,
    retriever_type,
  } = {}) {
    super({
      retrieverId: retriever_id,
      retrieverType: retriever_type,
    });
    this.fieldMappings = field_mappings;
    this.filterQuery = filter_query;
    this.knowledgeBaseId = knowledge_base_id;
    this.limit = limit;
    this.queryString = query_string;
  };
}

export default RetrieverActionExecutionPayloadResponse;
