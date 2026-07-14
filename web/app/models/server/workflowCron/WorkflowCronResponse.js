import WorkflowCron from './WorkflowCron';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowCronResponse extends WorkflowCron {
  constructor({
    workflow_cron_id,
    workflow_id,
    workflow_cron_name,
    cron,
    state_input,
    use_external_memory_input,
    state_memory_input_selector,
    owner_user,
    system_info,
    status,
    created_ts,
    updated_ts,
    sort_level,
  } = {}) {
    super({
      workflowCronId: workflow_cron_id,
      workflowId: workflow_id,
      workflowCronName: workflow_cron_name,
      cron,
      stateInput: state_input,
      useExternalMemoryInput: use_external_memory_input,
      stateMemoryInputSelector: state_memory_input_selector,
      ownerUser: owner_user,
      systemInfo: system_info,
      status,
      createdTs: created_ts,
      updatedTs: updated_ts,
      sortLevel: sort_level,
    });
  }
}

export default WorkflowCronResponse;
