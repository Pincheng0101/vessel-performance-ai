import { ConnectorConstant } from '~/constants';
import Connector from './Connector';
import ConnectorHeader from './ConnectorHeader';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

// Backward compatibility for legacy headers shaped as { HeaderName: 'value' }.
const normalizeConnectorHeader = header => typeof header === 'object' && header !== null ? header : { value: header, isSecret: false };
const toConnectorHeadersRequestPayload = headers => headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, ConnectorHeader.toRequestPayload(new ConnectorHeader(normalizeConnectorHeader(header)))])) : {};

class HttpConnector extends Connector {
  constructor({
    connectorId,
    connectorName,
    connectorType,
    headers,
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
    this.headers = headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, new ConnectorHeader(normalizeConnectorHeader(header))])) : null;
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
      { title: $i18n.t('__fieldHttpHeader', 2), value: Object.keys(this.headers || {}), isChip: true },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {HttpConnector} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      headers: toConnectorHeadersRequestPayload(resource.headers),
    };
  }
}

export default HttpConnector;
