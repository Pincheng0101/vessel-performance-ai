import { WorkflowTemplateConstant } from '~/constants';
import WorkflowDefinitionResourceReferenceConstant from './WorkflowDefinitionResourceReferenceConstant';
import WorkflowDefinitionResourceReferenceResource from './WorkflowDefinitionResourceReferenceResource';
import WorkflowDefinitionResourceReferenceResourceId from './WorkflowDefinitionResourceReferenceResourceId';

class WorkflowDefinitionResourceReferenceFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.referenceType
   */
  static create(payload) {
    switch (payload.referenceType) {
      case WorkflowTemplateConstant.ReferenceType.CONSTANT.value:
        return new WorkflowDefinitionResourceReferenceConstant(payload);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE.value:
        return new WorkflowDefinitionResourceReferenceResource(payload);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE_ID.value:
        return new WorkflowDefinitionResourceReferenceResourceId(payload);
    }
  }

  /**
   * @param {Object} reference
   * @returns {Object}
   */
  static toRequestPayload(reference) {
    switch (reference.referenceType) {
      case WorkflowTemplateConstant.ReferenceType.CONSTANT.value:
        return WorkflowDefinitionResourceReferenceConstant.toRequestPayload(reference);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE.value:
        return WorkflowDefinitionResourceReferenceResource.toRequestPayload(reference);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE_ID.value:
        return WorkflowDefinitionResourceReferenceResourceId.toRequestPayload(reference);
    }
  }
}

export default WorkflowDefinitionResourceReferenceFactory;
