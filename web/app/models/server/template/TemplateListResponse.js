import TemplateResponse from './TemplateResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TemplateListResponse {
  /**
   * @type {TemplateResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.templates.map(item => new TemplateResponse(item));
    this.nextToken = response.next_token;
  }
}

export default TemplateListResponse;
