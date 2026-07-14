import ConnectorHeaderResponse from './ConnectorHeaderResponse';
import HttpConnector from './HttpConnector';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class HttpConnectorResponse extends HttpConnector {
  constructor({
    connector_id,
    connector_name,
    connector_type,
    headers,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      connectorId: connector_id,
      connectorName: connector_name,
      connectorType: connector_type,
      headers: headers ? Object.fromEntries(Object.entries(headers).map(([key, header]) => [key, new ConnectorHeaderResponse(header)])) : {},
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default HttpConnectorResponse;
