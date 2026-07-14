/**
 * This class receives data from the API with parameters in snake_case.
 */
class ToolResultsRetrievalResponse {
  constructor({
    cited,
    data_fields,
    doc_id,
    filename,
    index,
    knowledge_base_id,
    snippet,
    tool_name,
  } = {}) {
    this.index = index;
    this.toolName = tool_name;
    this.knowledgeBaseId = knowledge_base_id;
    this.docId = doc_id;
    this.filename = filename;
    this.snippet = snippet;
    this.dataFields = data_fields;
    this.cited = cited ?? false;
  }
}

export default ToolResultsRetrievalResponse;
