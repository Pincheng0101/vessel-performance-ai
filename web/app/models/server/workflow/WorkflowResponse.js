import { WorkflowDefinition } from '~/models/workflow/state';
import Workflow from './Workflow';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class WorkflowResponse extends Workflow {
  constructor({
    definition,
    has_streaming_action,
    input_schema,
    output_schema,
    state_machine_arn,
    state_memory_input_selector,
    status,
    system_info,
    updated_ts,
    use_external_memory_input,
    workflow_id,
    workflow_name,
  } = {}) {
    super({
      definition: definition ? WorkflowDefinition.createFromAsl(definition) : definition,
      hasStreamingAction: has_streaming_action,
      inputSchema: input_schema,
      outputSchema: output_schema,
      stateMachineArn: state_machine_arn,
      stateMemoryInputSelector: state_memory_input_selector,
      status,
      systemInfo: system_info,
      updatedTs: updated_ts,
      useExternalMemoryInput: use_external_memory_input,
      workflowId: workflow_id,
      workflowName: workflow_name,
    });
  }
}

export default WorkflowResponse;
