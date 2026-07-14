import { WorkflowTemplateConstant } from '~/constants';
import WorkflowDefinitionResourceReferenceConstantResponse from './WorkflowDefinitionResourceReferenceConstantResponse';
import WorkflowDefinitionResourceReferenceResourceIdResponse from './WorkflowDefinitionResourceReferenceResourceIdResponse';
import WorkflowDefinitionResourceReferenceResourceResponse from './WorkflowDefinitionResourceReferenceResourceResponse';

class WorkflowDefinitionResourceReferenceResponseFactory {
  /**
   * @param {Object} payload
   * @param {String} payload.reference_type
   */
  static create(payload) {
    switch (payload.reference_type) {
      case WorkflowTemplateConstant.ReferenceType.CONSTANT.value:
        return new WorkflowDefinitionResourceReferenceConstantResponse(payload);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE.value:
        return new WorkflowDefinitionResourceReferenceResourceResponse(payload);
      case WorkflowTemplateConstant.ReferenceType.RESOURCE_ID.value:
        return new WorkflowDefinitionResourceReferenceResourceIdResponse(payload);
    }
  }
}

export default WorkflowDefinitionResourceReferenceResponseFactory;
