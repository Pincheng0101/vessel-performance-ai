import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';
import { WorkflowDefinition } from '~/models/workflow/state';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class Workflow extends Resource {
  constructor({
    definition,
    hasStreamingAction,
    inputSchema,
    outputSchema,
    stateMachineArn,
    stateMemoryInputSelector,
    status,
    systemInfo,
    updatedTs,
    useExternalMemoryInput,
    workflowId,
    workflowName,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    this.definition = definition;
    this.hasStreamingAction = hasStreamingAction;
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
    this.stateMachineArn = stateMachineArn;
    this.stateMemoryInputSelector = stateMemoryInputSelector;
    this.useExternalMemoryInput = useExternalMemoryInput;
    this.workflowId = workflowId;
    this.workflowName = workflowName;
  }

  get resourceType() {
    return ResourceConstant.Type.WORKFLOW.value;
  }

  get id() {
    return this.workflowId;
  }

  get name() {
    return this.workflowName;
  }

  /**
   * @returns {DisplayField}
   */
  get displayFieldDefinition() {
    const { $i18n } = useNuxtApp();
    return { title: $i18n.t('__fieldDefinition'), value: WorkflowDefinition.toAsl(this.definition), isJsonCode: true };
  };

  /**
   * @returns {DisplayField}
   */
  get displayFieldDefinitionComment() {
    const { $i18n } = useNuxtApp();
    return { title: $i18n.t('__fieldComment'), value: this.definition.comment, isMarkdown: true };
  };

  /**
   * @returns {DisplayField}
   */
  get displayFieldInputSchema() {
    const { $i18n } = useNuxtApp();
    return { title: $i18n.t('__fieldInputSchema'), value: this.inputSchema ?? undefined, isJsonCode: true };
  };

  /**
   * @returns {DisplayField}
   */
  get displayFieldOutputSchema() {
    const { $i18n } = useNuxtApp();
    return { title: $i18n.t('__fieldOutputSchema'), value: this.outputSchema ?? undefined, isJsonCode: true };
  };

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldStateMachineArn'), value: this.stateMachineArn, isCopyable: true, link: { href: arnUtils.toUrl(this.stateMachineArn), target: '_blank' } },
      { title: $i18n.t('__fieldDefinition'), value: this.definition, key: 'definition', isHidden: true, isJsonCode: true },
      { title: $i18n.t('__fieldUploadInputToExternalMemory'), value: this.useExternalMemoryInput ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), key: 'useExternalMemoryInput', isChip: true, chipOptions: { color: this.useExternalMemoryInput ? 'success' : null } },
      { title: $i18n.t('__fieldStateMemoryInputSelector'), value: this.stateMemoryInputSelector, key: 'stateMemoryInputSelector', isJsonCode: true, isHidden: !this.useExternalMemoryInput || !this.stateMemoryInputSelector },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {Workflow} resource
   */
  static toRequestPayload(resource) {
    return {
      definition: resource.definition,
      input_schema: resource.inputSchema,
      output_schema: resource.outputSchema,
      state_memory_input_selector: resource.stateMemoryInputSelector,
      use_external_memory_input: resource.useExternalMemoryInput,
      workflow_id: resource.workflowId,
      workflow_name: resource.workflowName,
    };
  }
}

export default Workflow;
