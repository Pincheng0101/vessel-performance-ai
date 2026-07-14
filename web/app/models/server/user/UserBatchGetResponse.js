import UserResponse from './UserResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UserBatchGetResponse {
  constructor({
    not_found_usernames,
    users,
  } = {}) {
    this.data = (users || []).map(item => new UserResponse(item));
    this.notFoundUserNames = not_found_usernames || [];
  }
}

export default UserBatchGetResponse;
