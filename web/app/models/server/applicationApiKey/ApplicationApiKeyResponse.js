import ApplicationApiKey from './ApplicationApiKey';
import ApplicationApiKeyProperties from './ApplicationApiKeyProperties';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ApplicationApiKeyResponse extends ApplicationApiKey {
  constructor({
    application_api_key_id,
    application_api_key_name,
    key_value,
    is_active,
    application_api_key_properties,
    status,
    system_info,
    updated_ts,
    sort_level,
  } = {}) {
    super({
      applicationApiKeyId: application_api_key_id,
      applicationApiKeyName: application_api_key_name,
      keyValue: key_value,
      isActive: is_active,
      applicationApiKeyProperties: application_api_key_properties
        ? new ApplicationApiKeyProperties(application_api_key_properties)
        : undefined,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
      sortLevel: sort_level,
    });
  }
}

export default ApplicationApiKeyResponse;
