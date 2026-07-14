import User from './User';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class UserResponse extends User {
  constructor({
    created_ts,
    email_verified,
    email,
    enabled,
    identity_provider,
    is_admin,
    mfa_setting_list,
    preferred_mfa,
    status,
    updated_ts,
    user_pool_id,
    username,
  } = {}) {
    super({
      createdTs: created_ts,
      email,
      emailVerified: email_verified,
      enabled,
      identityProvider: identity_provider,
      isAdmin: is_admin,
      mfaSettingList: mfa_setting_list,
      preferredMfa: preferred_mfa,
      status,
      updatedTs: updated_ts,
      userName: username,
      userPoolId: user_pool_id,
    });
  }
}

export default UserResponse;
