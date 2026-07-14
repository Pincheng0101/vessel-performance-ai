import { AccountConstant } from '~/constants';
import Resource from '~/models/server/Resource';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class ApiKey extends Resource {
  constructor({
    apiKeyId,
    apiKeyName,
    userName,
    description,
    keyValue,
    isActive,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.apiKeyId = apiKeyId ?? '';
    this.apiKeyName = apiKeyName ?? '';
    this.userName = userName ?? '';
    this.description = description ?? null;
    this.keyValue = keyValue ?? '';
    this.isActive = isActive ?? true;
  }

  get id() {
    return this.apiKeyId;
  }

  get name() {
    return this.apiKeyName;
  }

  get resourceType() {
    return AccountConstant.Base.API_KEY.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.apiKeyId, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.apiKeyName },
      { title: $i18n.t('__fieldDescription'), value: this.description },
      { title: $i18n.t('__fieldEnabled'), value: this.isActive ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: { color: this.isActive ? 'success' : null } },
      { title: $i18n.t('__fieldApiKey'), value: this.keyValue, isCopyable: true, isSecret: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {ApiKey} resource
   */
  static toRequestPayload(resource) {
    return {
      api_key_id: resource.apiKeyId,
      api_key_name: resource.apiKeyName,
      user_name: resource.userName,
      description: resource.description,
      key_value: resource.keyValue,
      is_active: resource.isActive,
    };
  }
}

export default ApiKey;
