import { ConnectorConstant } from '~/constants';
import AwsConnectorResponse from './AwsConnectorResponse';
import ConnectorResponse from './ConnectorResponse';
import HttpConnectorResponse from './HttpConnectorResponse';
import MySqlConnectorResponse from './MySqlConnectorResponse';
import OpenSearchConnectorResponse from './OpenSearchConnectorResponse';
import S3ConnectorResponse from './S3ConnectorResponse';

class ConnectorResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.connector_type
   */
  static create(payload) {
    switch (payload.connector_type) {
      case ConnectorConstant.Type.AWS.value:
        return new AwsConnectorResponse(payload);
      case ConnectorConstant.Type.S3.value:
        return new S3ConnectorResponse(payload);
      case ConnectorConstant.Type.OPENSEARCH.value:
        return new OpenSearchConnectorResponse(payload);
      case ConnectorConstant.Type.MYSQL.value:
        return new MySqlConnectorResponse(payload);
      case ConnectorConstant.Type.HTTP.value:
        return new HttpConnectorResponse(payload);
      default:
        return new ConnectorResponse(payload);
    }
  }
}

export default ConnectorResponseFactory;
