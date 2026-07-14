import { ResourceConstant } from '~/constants';

class DependentResource {
  constructor({
    resourceId,
    resourceName,
    resourceType,
  } = {}) {
    this.resourceId = resourceId;
    this.resourceName = resourceName;
    this.resourceType = resourceType;
  }

  get id() {
    return this.resourceId;
  }

  get name() {
    return this.resourceName;
  }

  get type() {
    return this.resourceType;
  }

  get path() {
    return `/${findField(ResourceConstant.Type, this.type, 'path')}/${this.id}`;
  }
}

export default DependentResource;
