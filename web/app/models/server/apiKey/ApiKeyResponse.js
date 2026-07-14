import ApiKey from './ApiKey';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ApiKeyResponse extends ApiKey {
  constructor({
    api_key_id,
    api_key_name,
    user_name,
    description,
    key_value,
    is_active,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      apiKeyId: api_key_id,
      apiKeyName: api_key_name,
      userName: user_name,
      description,
      keyValue: key_value,
      isActive: is_active,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default ApiKeyResponse;
