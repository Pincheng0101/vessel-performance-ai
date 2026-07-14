import { ConnectorConstant } from '~/constants';
import Connector from './Connector';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class MySqlConnector extends Connector {
  constructor({
    connectorId,
    connectorName,
    connectorType,
    mysqlHost,
    mysqlPassword,
    mysqlPort,
    mysqlUsername,
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
    this.mysqlHost = mysqlHost ?? '';
    this.mysqlPassword = mysqlPassword ?? '';
    this.mysqlPort = mysqlPort ?? 0;
    this.mysqlUsername = mysqlUsername ?? '';
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(ConnectorConstant.Type, this.type, 'title'), iconPath: findField(ConnectorConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldDatabaseHost'), value: this.mysqlHost },
      { title: $i18n.t('__fieldDatabasePort'), value: this.mysqlPort },
      { title: $i18n.t('__fieldDatabaseUsername'), value: this.mysqlUsername },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {MySqlConnector} resource
   */
  static toRequestPayload(resource) {
    const payload = {
      ...super.toRequestPayload(resource),
      mysql_host: resource.mysqlHost,
      mysql_port: resource.mysqlPort,
      mysql_username: resource.mysqlUsername,
    };
    // Only include mysqlPassword if it's explicitly provided
    if (resource.mysqlPassword) {
      payload.mysql_password = resource.mysqlPassword;
    }
    return payload;
  }

  /**
   * @param {MySqlConnector} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.mysqlHost && resource.mysqlPassword && resource.mysqlPort && resource.mysqlUsername) {
      return {
        mysql_host: resource.mysqlHost,
        mysql_password: resource.mysqlPassword,
        mysql_port: resource.mysqlPort,
        mysql_username: resource.mysqlUsername,
        connector_type: resource.connectorType,
      };
    }
    return {
      connector_id: resource.connectorId,
      connector_type: resource.connectorType,
    };
  }
}

export default MySqlConnector;
