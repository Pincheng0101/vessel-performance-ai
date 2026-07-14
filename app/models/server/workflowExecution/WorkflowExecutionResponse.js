import { WorkflowDefinition } from '~/models/workflow/state';
import WorkflowExecution from './WorkflowExecution';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowExecutionResponse extends WorkflowExecution {
  constructor({
    cause,
    display_name,
    error,
    execution_arn,
    input,
    name,
    output,
    raw_input,
    raw_output,
    start_ts,
    state_memory_input_selector,
    status,
    stop_ts,
    use_external_memory_input,
    workflow_definition,
    workflow_id,
  } = {}) {
    super({
      cause,
      displayName: display_name,
      error,
      executionArn: execution_arn,
      input,
      name,
      output,
      rawInput: raw_input,
      rawOutput: raw_output,
      startTs: start_ts,
      stateMemoryInputSelector: state_memory_input_selector,
      status,
      stopTs: stop_ts,
      useExternalMemoryInput: use_external_memory_input,
      workflowDefinition: workflow_definition ? WorkflowDefinition.createFromAsl(workflow_definition) : null,
      workflowId: workflow_id,
    });
  }
}

export default WorkflowExecutionResponse;
