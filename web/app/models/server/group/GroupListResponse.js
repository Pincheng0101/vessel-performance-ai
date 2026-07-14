import GroupResponse from './GroupResponse';

/**
 * @import { GroupResponse } from '~/models/server/group'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GroupListResponse {
  /**
   * @type {GroupResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.groups.map(item => new GroupResponse(item));
    this.nextToken = response.next_token;
  }
}

export default GroupListResponse;
