import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

class Connector extends Resource {
  constructor({
    connectorId,
    connectorName,
    connectorType,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.connectorId = connectorId ?? '';
    this.connectorName = connectorName ?? '';
    this.connectorType = connectorType ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.CONNECTOR.value;
  }

  get id() {
    return this.connectorId;
  }

  get name() {
    return this.connectorName;
  }

  get type() {
    return this.connectorType;
  }

  /**
   * @param {Connector} resource
   */
  static toRequestPayload(resource) {
    return {
      connector_id: resource.connectorId,
      connector_name: resource.connectorName,
      connector_type: resource.connectorType,
    };
  }
}

export default Connector;
