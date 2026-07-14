import { ResourceConstant } from '~/constants';
import { Runtime } from '~/models/server';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class WorkflowExecution extends Runtime {
  constructor({
    cause,
    displayName,
    error,
    executionArn,
    input,
    name,
    output,
    rawInput,
    rawOutput,
    startTs,
    stateMemoryInputSelector,
    status,
    stopTs,
    useExternalMemoryInput,
    workflowDefinition,
    workflowId,
  } = {}) {
    super({
      status,
    });
    this.cause = cause;
    this.displayName = displayName;
    this.error = error;
    this.executionArn = executionArn;
    this.input = input;
    this.name = name;
    this.output = output;
    this.rawInput = rawInput;
    this.rawOutput = rawOutput;
    this.startTs = startTs;
    this.stateMemoryInputSelector = stateMemoryInputSelector;
    this.stopTs = stopTs;
    this.useExternalMemoryInput = useExternalMemoryInput;
    this.workflowDefinition = workflowDefinition;
    this.workflowId = workflowId;
  }

  get id() {
    return this.name;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldName'), value: this.displayName, link: { href: `${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, arnUtils.getWorkflowId(this.executionArn))}/executions/${this.executionArn}`, target: '_blank' } },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldExecutionArn'), value: this.executionArn, isCopyable: true, link: { href: arnUtils.toUrl(this.executionArn), target: '_blank' } },
      { title: $i18n.t('__fieldError'), value: this.error, isChip: true, isHidden: !this.error },
      { title: $i18n.t('__fieldCause'), value: this.cause, isJsonCode: true, isHidden: !this.cause, editorOptions: { enableLineWrapping: true, lines: 10 } },
      { title: $i18n.t('__fieldExecutionTime'), value: this.stopTs ? (this.stopTs - this.startTs) * 1000 : null, isTimeInterval: !!this.stopTs },
      { title: $i18n.t('__fieldStartTs'), value: this.startTs, isTimestamp: true, timestampOptions: { isRelative: false } },
      { title: $i18n.t('__fieldStopTs'), value: this.stopTs, isTimestamp: true, timestampOptions: { isRelative: false } },
    ];
  }

  get downloadFileName() {
    return [this.workflowName, this.displayName].filter(Boolean).join('-');
  }

  /**
   * @param {boolean} isJsonToMarkdown
   * @param {boolean} enableAnchors
   * @param {boolean} enableToc
   * @returns {DisplayField}
   */
  getOutputDisplayField({ isJsonToMarkdown = true, enableAnchors = true, enableToc = true } = {}) {
    const { $i18n } = useNuxtApp();
    const sortedValue = jsonSchemaUtils.sortObject(this.rawOutput, this.outputSchema);
    return { title: $i18n.t('__fieldOutput'), value: objUtils.isEmpty(sortedValue) ? '' : sortedValue, isJsonToMarkdown, markdownViewerOptions: { enableAnchors, enableToc, downloadFileName: `${this.downloadFileName}-output` } };
  }

  /**
   * @param {boolean} isJsonToMarkdown
   * @param {boolean} enableAnchors
   * @param {boolean} enableToc
   * @returns {DisplayField}
   */
  getInputDisplayField({ isJsonToMarkdown = true, enableAnchors = true, enableToc = true } = {}) {
    const { $i18n } = useNuxtApp();
    const sortedValue = jsonSchemaUtils.sortObject(this.rawInput, this.inputSchema);
    return { title: $i18n.t('__fieldInput'), value: objUtils.isEmpty(sortedValue) ? '' : sortedValue, isJsonToMarkdown, markdownViewerOptions: { enableAnchors, enableToc, downloadFileName: `${this.downloadFileName}-input` } };
  }

  /**
   * Sets the input schema for sorting the input object
   */
  setInputSchema(inputSchema) {
    this.inputSchema = inputSchema;
    return this;
  }

  /**
   * Sets the output schema for sorting the output object
   */
  setOutputSchema(outputSchema) {
    this.outputSchema = outputSchema;
    return this;
  }

  /**
   * Sets the input markdown downloaded file name
   */
  setWorkflowName(name) {
    this.workflowName = name;
    return this;
  }

  /**
   * @param {WorkflowExecution} runtime
   */
  static toRequestPayload(runtime) {
    return {
      workflow_id: runtime.workflowId,
      name: runtime.name,
      display_name: runtime.displayName,
      input: runtime.input,
      use_external_memory_input: runtime.useExternalMemoryInput,
      state_memory_input_selector: runtime.stateMemoryInputSelector,
    };
  }

  /**
   * @param {WorkflowExecution} runtime
   */
  static toRequestPayloadWithExternalMemory(runtime) {
    return {
      workflow_id: runtime.workflowId,
      name: runtime.name,
      display_name: runtime.displayName,
      external_memory_id: runtime.externalMemoryId,
      state_memory_input_selector: runtime.stateMemoryInputSelector,
    };
  }
}

export default WorkflowExecution;
