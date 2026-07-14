import WorkflowCronExecution from './WorkflowCronExecution';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowCronExecutionResponse extends WorkflowCronExecution {
  constructor({
    workflow_cron_id,
    execution_ts,
    execution_arn,
    workflow_id,
    status,
    error,
    updated_ts,
    ttl,
  } = {}) {
    super({
      workflowCronId: workflow_cron_id,
      executionTs: execution_ts,
      executionArn: execution_arn,
      workflowId: workflow_id,
      status,
      error,
      updatedTs: updated_ts,
      ttl,
    });
  }
}

export default WorkflowCronExecutionResponse;
