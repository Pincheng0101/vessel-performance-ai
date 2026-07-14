import { ResourceConstant } from '~/constants';
import DependentResourceResponse from './DependentResourceResponse';
import NotFoundResource from './NotFoundResource';

class ErrorResponse {
  constructor({
    dependents,
    detail,
    message,
    status,
    type,
  } = {}) {
    this.dependents = dependents?.map(dependency => new DependentResourceResponse(dependency));
    this.detail = detail;
    this.message = message;
    this.status = status;
    this.type = type;
  }

  get isStatusUnprocessableEntity() {
    return this.status === 422;
  }

  setStatus(status) {
    this.status = status;
  }

  getMessage() {
    if (Array.isArray(this.detail)) {
      const [firstDetail] = this.detail;
      return typeof firstDetail === 'object' ? firstDetail.msg : firstDetail;
    }
    return this.detail || this.message;
  }

  findValidationError(type) {
    if (Array.isArray(this.detail)) {
      return this.detail.find(item => item.type === type);
    }
    return null;
  }

  get hasDependents() {
    return this.dependents?.length > 0;
  }

  get isStatusNotFound() {
    return this.getMessage().includes('not found');
  }

  get notFoundResourceModule() {
    if (!this.isStatusNotFound) return '';
    return findField(ResourceConstant.Type, String(this.getMessage().split(' ')[0]).toLowerCase(), 'module');
  }

  get notFoundResourceId() {
    if (!this.isStatusNotFound) return '';
    return this.getMessage().split(' ')[1];
  }

  get notFoundResource() {
    if (!this.isStatusNotFound || !this.notFoundResourceModule) return '';
    return new NotFoundResource({
      resourceType: this.notFoundResourceModule,
      resourceId: this.notFoundResourceId,
    });
  }
}

export default ErrorResponse;
