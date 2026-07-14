import WorkflowDefinition from './WorkflowDefinition';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class WorkflowTemplate {
  constructor({
    workflowDefinition = null,
    workflowTemplateId,
    workflowTemplateName,
    description,
    status,
    tags,
  } = {}) {
    this.workflowDefinition = workflowDefinition ? new WorkflowDefinition(workflowDefinition) : null;
    this.workflowTemplateId = workflowTemplateId;
    this.workflowTemplateName = workflowTemplateName;
    this.description = description;
    this.status = status;
    this.tags = tags;
  }

  /**
   * @returns {DisplayField}
   */
  get displayFieldDescription() {
    const { $i18n } = useNuxtApp();
    return { title: $i18n.t('__fieldDescription'), value: this.description, isMarkdown: true };
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldTag', 2), value: this.tags?.map(t => strUtils.escapeControlChars(t)), isChip: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {WorkflowTemplate} template
   */
  static toRequestPayload(template) {
    return {
      workflow_definition: WorkflowDefinition.toRequestPayload(template.workflowDefinition),
      workflow_template_name: template.workflowTemplateName,
      description: template.description,
      tags: template.tags,
    };
  }
}

export default WorkflowTemplate;
