import { AwsConstant, LlmConstant } from '~/constants';
import Llm from './Llm';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class BedrockLlamaLlm extends Llm {
  constructor({
    accountId,
    awsAccessKeyId,
    awsSecretAccessKey,
    llmId,
    llmName,
    llmType,
    maxTokens,
    model,
    performanceConfigLatency,
    region,
    roleName,
    status,
    systemInfo,
    systemPrompt,
    temperature,
    topP,
    updatedTs,
  } = {}) {
    super({
      llmId,
      llmName,
      llmType,
      maxTokens,
      model,
      status,
      systemInfo,
      systemPrompt,
      temperature,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.accountId = accountId ?? null;
    this.awsAccessKeyId = awsAccessKeyId ?? null;
    this.awsSecretAccessKey = awsSecretAccessKey ?? null;
    this.performanceConfigLatency = performanceConfigLatency ?? null;
    this.region = region ?? '';
    this.roleName = roleName ?? null;
    this.topP = topP ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    const isCrossRegionInferenceEnabled = Object.values(LlmConstant.CrossRegionInferencePrefix).some(prefix => this.model.startsWith(prefix));
    const displayFields = [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(LlmConstant.Type, this.type, 'title'), iconPath: findField(LlmConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldCrossRegionInference'), value: isCrossRegionInferenceEnabled ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: { color: isCrossRegionInferenceEnabled ? 'success' : null } },
      { title: $i18n.t('__fieldModel'), value: findField(LlmConstant.Model, this.model, 'title') },
      { title: $i18n.t('__fieldRegion'), value: findField(AwsConstant.Region, this.region, 'title') },
      { title: $i18n.t('__fieldMaxTokens'), value: this.maxTokens },
      { title: $i18n.t('__fieldTemperature'), value: this.temperature },
      { title: $i18n.t('__fieldTopP'), value: this.topP },
      { title: $i18n.t('__fieldPerformanceConfigLatency'), value: findField(LlmConstant.BedrockPerformanceConfigLatencyOption, this.performanceConfigLatency, 'i18nTitle') ? $i18n.t(findField(LlmConstant.BedrockPerformanceConfigLatencyOption, this.performanceConfigLatency, 'i18nTitle')) : '' },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];

    let credentialDisplayFields = [];
    if (this.accountId && this.roleName) {
      credentialDisplayFields = [
        { title: $i18n.t('__fieldAccountId'), value: this.accountId, isCopyable: true },
        { title: $i18n.t('__fieldRoleName'), value: this.roleName },
      ];
    } else if (this.awsAccessKeyId) {
      credentialDisplayFields = [
        { title: $i18n.t('__fieldAwsAccessKeyId'), value: this.awsAccessKeyId, isCopyable: true },
      ];
    }

    const insertIndex = displayFields.findIndex(field => field.title === $i18n.t('__fieldMaxTokens'));
    displayFields.splice(insertIndex, 0, ...credentialDisplayFields);
    return displayFields;
  }

  /**
   * @returns {DisplayField[]}
   */
  get systemPromptDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldSystemPrompt'), value: this.systemPrompt, isBlockText: true },
    ];
  }

  /**
   * @param {BedrockLlamaLlm} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      performance_config_latency: resource.performanceConfigLatency,
      region: resource.region,
      top_p: resource.topP,
    };

    const hasIamRole = resource.accountId && resource.roleName;
    const hasAccessKey = resource.awsAccessKeyId && resource.awsSecretAccessKey;
    const hasNoCredential = !resource.accountId && !resource.roleName && !resource.awsAccessKeyId && !resource.awsSecretAccessKey;

    if (hasIamRole) {
      // Set IAM role fields and explicitly clear access key fields
      payload.account_id = resource.accountId;
      payload.role_name = resource.roleName;
      payload.aws_access_key_id = null;
      payload.aws_secret_access_key = null;
    } else if (hasAccessKey) {
      // Set access key fields and explicitly clear IAM role fields
      payload.aws_access_key_id = resource.awsAccessKeyId;
      payload.aws_secret_access_key = resource.awsSecretAccessKey;
      payload.account_id = null;
      payload.role_name = null;
    } else if (hasNoCredential) {
      // Clear all credential fields
      payload.account_id = null;
      payload.role_name = null;
      payload.aws_access_key_id = null;
      payload.aws_secret_access_key = null;
    } else if (resource.awsAccessKeyId) {
      // Partial update and keep existing credentials
      payload.aws_access_key_id = resource.awsAccessKeyId;
    }

    return payload;
  }

  /**
   * @param {BedrockLlamaLlm} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.awsAccessKeyId && resource.awsSecretAccessKey) {
      return {
        aws_access_key_id: resource.awsAccessKeyId,
        aws_secret_access_key: resource.awsSecretAccessKey,
        model: resource.model,
        llm_type: resource.llmType,
      };
    }
    if (resource.accountId && resource.roleName) {
      return {
        account_id: resource.accountId,
        role_name: resource.roleName,
        model: resource.model,
        llm_type: resource.llmType,
      };
    }
    return {
      llm_id: resource.llmId,
      llm_type: resource.llmType,
    };
  }
}

export default BedrockLlamaLlm;
