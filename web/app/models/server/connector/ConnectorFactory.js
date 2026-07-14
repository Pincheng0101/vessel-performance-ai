import { ConnectorConstant } from '~/constants';
import AwsConnector from './AwsConnector';
import Connector from './Connector';
import HttpConnector from './HttpConnector';
import MySqlConnector from './MySqlConnector';
import OpenSearchConnector from './OpenSearchConnector';
import S3Connector from './S3Connector';

class ConnectorFactory {
  /**
   * @param {Connector} payload
   */
  static create(payload) {
    switch (payload.connectorType) {
      case ConnectorConstant.Type.AWS.value:
        return new AwsConnector(payload);
      case ConnectorConstant.Type.S3.value:
        return new S3Connector(payload);
      case ConnectorConstant.Type.OPENSEARCH.value:
        return new OpenSearchConnector(payload);
      case ConnectorConstant.Type.MYSQL.value:
        return new MySqlConnector(payload);
      case ConnectorConstant.Type.HTTP.value:
        return new HttpConnector(payload);
      default:
        return new Connector(payload);
    }
  }

  /**
   * @param {Connector} resource
   */
  static toRequestPayload(resource) {
    switch (resource.connectorType) {
      case ConnectorConstant.Type.AWS.value:
        return AwsConnector.toRequestPayload(resource);
      case ConnectorConstant.Type.S3.value:
        return S3Connector.toRequestPayload(resource);
      case ConnectorConstant.Type.OPENSEARCH.value:
        return OpenSearchConnector.toRequestPayload(resource);
      case ConnectorConstant.Type.MYSQL.value:
        return MySqlConnector.toRequestPayload(resource);
      case ConnectorConstant.Type.HTTP.value:
        return HttpConnector.toRequestPayload(resource);
      default:
        return Connector.toRequestPayload(resource);
    }
  }

  /**
   * @param {Connector} resource
   */
  static toValidateRequestPayload(resource) {
    switch (resource.connectorType) {
      case ConnectorConstant.Type.AWS.value:
        return AwsConnector.toValidateRequestPayload(resource);
      case ConnectorConstant.Type.S3.value:
        return S3Connector.toValidateRequestPayload(resource);
      case ConnectorConstant.Type.OPENSEARCH.value:
        return OpenSearchConnector.toValidateRequestPayload(resource);
      case ConnectorConstant.Type.MYSQL.value:
        return MySqlConnector.toValidateRequestPayload(resource);
      default:
        return null;
    }
  }
}

export default ConnectorFactory;
