import { ConnectorConstant } from '~/constants';
import Connector from './Connector';
import ConnectorHeader from './ConnectorHeader';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

// Backward compatibility for legacy headers shaped as { HeaderName: 'value' }.
const normalizeConnectorHeader = header => typeof header === 'object' && header !== null ? header : { value: header, isSecret: false };
const toConnectorHeadersRequestPayload = headers => headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, ConnectorHeader.toRequestPayload(new ConnectorHeader(normalizeConnectorHeader(header)))])) : null;

class OpenSearchConnector extends Connector {
  constructor({
    connectorId,
    connectorName,
    connectorType,
    headers,
    openSearchHost,
    openSearchPort,
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
    // Set fields explicitly to prevent backend default values
    this.headers = headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, new ConnectorHeader(normalizeConnectorHeader(header))])) : null;
    this.openSearchHost = openSearchHost ?? '';
    this.openSearchPort = openSearchPort ?? 0;
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
      { title: $i18n.t('__fieldOpenSearchHost'), value: this.openSearchHost },
      { title: $i18n.t('__fieldOpenSearchPort'), value: this.openSearchPort },
      { title: $i18n.t('__fieldHttpHeader', 2), value: Object.keys(this.headers || {}), isChip: true },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {OpenSearchConnector} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      headers: toConnectorHeadersRequestPayload(resource.headers),
      opensearch_host: resource.openSearchHost,
      opensearch_port: resource.openSearchPort,
    };
  }

  /**
   * @param {OpenSearchConnector} resource
   */
  static toValidateRequestPayload(resource) {
    if (resource.openSearchHost && resource.openSearchPort) {
      return {
        headers: toConnectorHeadersRequestPayload(resource.headers),
        opensearch_host: resource.openSearchHost,
        opensearch_port: resource.openSearchPort,
        connector_type: resource.connectorType,
      };
    }
    return {
      connector_id: resource.connectorId,
      connector_type: resource.connectorType,
    };
  }
}

export default OpenSearchConnector;
