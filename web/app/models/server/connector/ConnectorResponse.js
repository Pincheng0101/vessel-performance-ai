import Connector from './Connector';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ConnectorResponse extends Connector {
  constructor({
    connector_id,
    connector_name,
    connector_type,
    system_info,
    status,
    updated_ts,
  } = {}) {
    super({
      connectorId: connector_id,
      connectorName: connector_name,
      connectorType: connector_type,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default ConnectorResponse;
