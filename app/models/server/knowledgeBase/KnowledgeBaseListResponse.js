import KnowledgeBaseResponseFactory from './KnowledgeBaseResponseFactory';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class KnowledgeBaseListResponse {
  /**
   * @type {KnowledgeBaseResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.knowledge_bases.map(KnowledgeBaseResponseFactory.create);
    this.nextToken = response.next_token;
  }
}

export default KnowledgeBaseListResponse;
