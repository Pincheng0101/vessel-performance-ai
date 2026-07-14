import UserResponse from './UserResponse';

/**
 * @import { UserResponse } from '~/models/server/user'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UserListResponse {
  /**
   * @type {UserResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.users.map(item => new UserResponse(item));
    this.nextToken = response.next_token;
  }
}

export default UserListResponse;
