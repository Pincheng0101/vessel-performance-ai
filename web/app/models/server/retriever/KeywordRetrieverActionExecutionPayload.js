import RetrieverActionExecutionPayload from './RetrieverActionExecutionPayload';

class KeywordRetrieverActionExecutionPayload extends RetrieverActionExecutionPayload {
  constructor({
    fieldMappings,
    filterQuery,
    knowledgeBaseId,
    limit,
    queryString,
    queryStrings,
    retrieverId,
    retrieverType,
    searchQuery,
  } = {}) {
    super({
      fieldMappings,
      filterQuery,
      knowledgeBaseId,
      limit,
      queryString,
      retrieverId,
      retrieverType,
    });
    this.queryStrings = queryStrings;
    this.searchQuery = searchQuery;
  };

  /**
   * @param {KeywordRetrieverActionExecutionPayload} retriever
   */
  static toRequestPayload(retriever) {
    return {
      ...RetrieverActionExecutionPayload.toRequestPayload(retriever),
      query_strings: retriever.queryStrings,
      search_query: retriever.searchQuery,
    };
  }
}

export default KeywordRetrieverActionExecutionPayload;
