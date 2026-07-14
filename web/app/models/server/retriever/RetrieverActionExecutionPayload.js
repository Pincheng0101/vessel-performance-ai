class RetrieverActionExecutionPayload {
  constructor({
    fieldMappings,
    filterQuery,
    knowledgeBaseId,
    limit,
    queryString,
    retrieverId,
    retrieverType,
  } = {}) {
    this.fieldMappings = fieldMappings;
    this.filterQuery = filterQuery;
    this.knowledgeBaseId = knowledgeBaseId;
    this.limit = limit;
    this.queryString = queryString;
    this.retrieverId = retrieverId;
    this.retrieverType = retrieverType;
  };

  /**
   * @param {RetrieverActionExecutionPayload} retriever
   */
  static toRequestPayload(retriever) {
    return {
      field_mappings: retriever.fieldMappings,
      filter_query: retriever.filterQuery,
      knowledge_base_id: retriever.knowledgeBaseId,
      limit: retriever.limit,
      query_string: retriever.queryString,
      retriever_id: retriever.retrieverId,
      retriever_type: retriever.retrieverType,
    };
  }
}

export default RetrieverActionExecutionPayload;
