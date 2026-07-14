import ConnectorHeaderResponse from './ConnectorHeaderResponse';
import OpenSearchConnector from './OpenSearchConnector';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class OpenSearchConnectorResponse extends OpenSearchConnector {
  constructor({
    connector_id,
    connector_name,
    connector_type,
    headers,
    opensearch_host,
    opensearch_port,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      connectorId: connector_id,
      connectorName: connector_name,
      connectorType: connector_type,
      headers: headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, new ConnectorHeaderResponse(header)])) : null,
      openSearchHost: opensearch_host,
      openSearchPort: opensearch_port,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default OpenSearchConnectorResponse;
