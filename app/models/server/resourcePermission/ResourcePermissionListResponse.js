import ResourcePermissionResponse from './ResourcePermissionResponse';

/**
 * @import { ResourcePermissionResponse } from '~/models/server/resourcePermission'
 */

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ResourcePermissionListResponse {
  /**
   * @type {ResourcePermissionResponse[]}
   */
  data = [];

  constructor(response) {
    this.data = response.resource_permissions.map(item => new ResourcePermissionResponse(item));
    this.nextToken = response.next_token;
  }
}

export default ResourcePermissionListResponse;
