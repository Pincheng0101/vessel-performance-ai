import CreateResourcePermission from './CreateResourcePermission';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class CreateResourcePermissionResponse extends CreateResourcePermission {
  constructor({
    group_name,
    data,
    updated_ts,
  } = {}) {
    super({
      groupName: group_name,
      data,
      updatedTs: updated_ts,
    });
  }
}

export default CreateResourcePermissionResponse;
