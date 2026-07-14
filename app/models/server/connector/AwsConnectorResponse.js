import AwsConnector from './AwsConnector';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class AwsConnectorResponse extends AwsConnector {
  constructor({
    account_id,
    aws_access_key_id,
    aws_secret_access_key,
    connector_id,
    connector_name,
    connector_type,
    region_name,
    role_name,
    status,
    system_info,
    updated_ts,
  } = {}) {
    super({
      accountId: account_id,
      awsAccessKeyId: aws_access_key_id,
      awsSecretAccessKey: aws_secret_access_key,
      connectorId: connector_id,
      connectorName: connector_name,
      connectorType: connector_type,
      regionName: region_name,
      roleName: role_name,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default AwsConnectorResponse;
