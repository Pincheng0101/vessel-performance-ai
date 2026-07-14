import { Resource } from '~/models/server';

class WorkflowCron extends Resource {
  constructor({
    createdTs,
    cron,
    ownerUser,
    sortLevel,
    stateInput,
    stateMemoryInputSelector,
    status,
    systemInfo,
    updatedTs,
    useExternalMemoryInput,
    workflowCronId,
    workflowCronName,
    workflowId,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.workflowCronId = workflowCronId ?? '';
    this.workflowId = workflowId ?? '';
    this.workflowCronName = workflowCronName ?? '';
    this.cron = cron ?? '';
    this.stateInput = stateInput ?? null;
    this.useExternalMemoryInput = useExternalMemoryInput ?? null;
    this.stateMemoryInputSelector = stateMemoryInputSelector ?? null;
    this.ownerUser = ownerUser ?? null;
    this.createdTs = createdTs ?? null;
    this.sortLevel = sortLevel ?? 0;
  }

  get id() {
    return this.workflowCronId;
  }

  get name() {
    return this.workflowCronName;
  }

  /**
     * @returns {DisplayField[]}
     */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.workflowCronId, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.workflowCronName },
      { title: $i18n.t('__fieldCronJob'), value: this.cron },
      { title: $i18n.t('__fieldOwnerUser'), value: this.ownerUser },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldUploadInputToExternalMemory'), value: this.useExternalMemoryInput, isBoolean: true },
      { title: $i18n.t('__fieldStateMemoryInputSelector'), value: this.stateMemoryInputSelector, isJson: true },
      { title: $i18n.t('__fieldCreated'), value: this.createdTs, isTimestamp: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get stateInputDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStateInput'), value: this.stateInput, isJsonCode: true },
    ];
  }

  /**
   * @param {WorkflowCron} resource
   */
  static toRequestPayload(resource) {
    return {
      workflow_cron_id: resource.workflowCronId,
      workflow_cron_name: resource.workflowCronName,
      cron: resource.cron,
      state_input: resource.stateInput,
      status: resource.status,
      use_external_memory_input: resource.useExternalMemoryInput,
      state_memory_input_selector: resource.stateMemoryInputSelector,
      workflow_id: resource.workflowId,
    };
  }
}

export default WorkflowCron;
