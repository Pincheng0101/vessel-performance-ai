import MySqlConnector from './MySqlConnector';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class MySqlConnectorResponse extends MySqlConnector {
  constructor({
    connector_id,
    connector_name,
    connector_type,
    mysql_host,
    mysql_password,
    mysql_port,
    mysql_username,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      connectorId: connector_id,
      connectorName: connector_name,
      connectorType: connector_type,
      mysqlHost: mysql_host,
      mysqlPassword: mysql_password,
      mysqlPort: mysql_port,
      mysqlUsername: mysql_username,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default MySqlConnectorResponse;
