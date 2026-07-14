import { AccountConstant, StatusConstant } from '~/constants';
import Resource from '~/models/server/Resource';
import ApplicationApiKeyProperties from './ApplicationApiKeyProperties';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class ApplicationApiKey extends Resource {
  constructor({
    applicationApiKeyId,
    applicationApiKeyName,
    keyValue,
    isActive,
    applicationApiKeyProperties,
    status,
    systemInfo,
    updatedTs,
    sortLevel,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.applicationApiKeyId = applicationApiKeyId ?? '';
    this.applicationApiKeyName = applicationApiKeyName ?? '';
    this.keyValue = keyValue ?? '';
    this.isActive = isActive ?? true;
    this.sortLevel = sortLevel ?? 0;
    this.applicationApiKeyProperties = applicationApiKeyProperties instanceof ApplicationApiKeyProperties
      ? applicationApiKeyProperties
      : new ApplicationApiKeyProperties(applicationApiKeyProperties ?? {});
  }

  get id() {
    return this.applicationApiKeyId;
  }

  get name() {
    return this.applicationApiKeyName;
  }

  get resourceType() {
    return AccountConstant.Base.APPLICATION_API_KEY.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.applicationApiKeyId, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.applicationApiKeyName },
      { title: $i18n.t('__fieldApplicationApiKeyGroups'), value: this.applicationApiKeyProperties.groups, isChip: true },
      { title: $i18n.t('__fieldDescription'), value: this.applicationApiKeyProperties.description },
      { title: $i18n.t('__fieldApiKey'), value: this.keyValue, isCopyable: true, isSecret: true },
      { title: $i18n.t('__fieldEnabled'), value: this.isActive ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: { color: this.isActive ? 'success' : null } },
      { title: $i18n.t('__fieldStatus'), value: $i18n.t(findField(StatusConstant.Runtime, this.status, 'i18nTitle') ?? '__fieldStatusUnknown'), isChip: true, chipOptions: { color: this.status === StatusConstant.Runtime.READY.value ? 'success' : null } },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {ApplicationApiKey} resource
   */
  static toRequestPayload(resource) {
    return {
      application_api_key_id: resource.applicationApiKeyId,
      application_api_key_name: resource.applicationApiKeyName,
      is_active: resource.isActive,
      application_api_key_properties: ApplicationApiKeyProperties.toRequestPayload(resource.applicationApiKeyProperties),
    };
  }
}

export default ApplicationApiKey;
