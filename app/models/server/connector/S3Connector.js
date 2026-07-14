import { ConnectorConstant } from '~/constants';
import Connector from './Connector';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class S3Connector extends Connector {
  constructor({
    accountId,
    awsAccessKeyId,
    awsSecretAccessKey,
    connectorId,
    connectorName,
    connectorType,
    endpointUrl,
    roleName,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      connectorId,
      connectorName,
      connectorType,
      status,
      systemInfo,
      updatedTs,
    });
    this.accountId = accountId ?? null;
    this.awsAccessKeyId = awsAccessKeyId ?? null;
    this.awsSecretAccessKey = awsSecretAccessKey ?? null;
    this.endpointUrl = endpointUrl ?? null;
    this.roleName = roleName ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    const displayFields = [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(ConnectorConstant.Type, this.type, 'title'), iconPath: findField(ConnectorConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldEndpointUrl'), value: this.endpointUrl },
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

    const insertIndex = displayFields.findIndex(field => field.title === $i18n.t('__fieldEndpointUrl'));
    displayFields.splice(insertIndex, 0, ...credentialDisplayFields);
    return displayFields;
  }

  /**
   * @param {S3Connector} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      endpoint_url: resource.endpointUrl,
    };

    const hasIamRole = resource.accountId && resource.roleName;
    const hasAccessKey = resource.awsAccessKeyId && resource.awsSecretAccessKey;

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
    } else if (resource.awsAccessKeyId) {
      // Partial update and keep existing credentials
      payload.aws_access_key_id = resource.awsAccessKeyId;
    }

    return payload;
  }

  /**
   * @param {S3Connector} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.awsAccessKeyId && resource.awsSecretAccessKey) {
      return {
        aws_access_key_id: resource.awsAccessKeyId,
        aws_secret_access_key: resource.awsSecretAccessKey,
        endpoint_url: resource.endpointUrl,
        connector_type: resource.connectorType,
      };
    }
    if (resource.accountId && resource.roleName) {
      return {
        account_id: resource.accountId,
        role_name: resource.roleName,
        endpoint_url: resource.endpointUrl,
        connector_type: resource.connectorType,
      };
    }
    return {
      connector_id: resource.connectorId,
      connector_type: resource.connectorType,
    };
  }
}

export default S3Connector;
