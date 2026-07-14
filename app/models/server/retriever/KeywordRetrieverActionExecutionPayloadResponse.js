import RetrieverActionExecutionPayloadResponse from './RetrieverActionExecutionPayloadResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class KeywordRetrieverActionExecutionPayloadResponse extends RetrieverActionExecutionPayloadResponse {
  constructor({
    field_mappings,
    filter_query,
    knowledge_base_id,
    limit,
    query_string,
    query_strings,
    retriever_id,
    retriever_type,
    search_query,
  } = {}) {
    super({
      field_mappings,
      filter_query,
      knowledge_base_id,
      limit,
      query_string,
      retriever_id,
      retriever_type,
    });
    this.queryStrings = query_strings;
    this.searchQuery = search_query;
  };
}

export default KeywordRetrieverActionExecutionPayloadResponse;
