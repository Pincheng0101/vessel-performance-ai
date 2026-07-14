import Group from './Group';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class GroupResponse extends Group {
  constructor({
    created_ts,
    description,
    group_name,
    precedence,
    role_arn,
    updated_ts,
    user_pool_id,
  } = {}) {
    super({
      createdTs: created_ts,
      description,
      groupName: group_name,
      precedence,
      roleArn: role_arn,
      updatedTs: updated_ts,
      userPoolId: user_pool_id,
    });
  }
}

export default GroupResponse;
