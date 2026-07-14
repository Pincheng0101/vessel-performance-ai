import { StartSyncWorkflowExecutionConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import StartSyncWorkflowExecutionDefaultOutput from './StartSyncWorkflowExecutionDefaultOutput';

class StartSyncWorkflowExecutionPayload extends TaskPayload {
  actionType = StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value;

  /**
   * @param {boolean} params.useExternalMemoryInput
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.input
   * @param {Object} params.stateMemoryInputSelector
   * @param {Object} params.stateMemoryOutputSelector
   * @param {StartSyncWorkflowExecutionDefaultOutput} params.defaultOutput
   * @param {string} params.stateMachineArn
   * @param {string} params.workflowId
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    input,
    stateMachineArn,
    stateMemoryInputSelector,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryInput,
    useExternalMemoryOutput,
    workflowId,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new StartSyncWorkflowExecutionDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.input = input ?? StartSyncWorkflowExecutionConstant.ActionExecutionParams.INPUT;
    this.stateMachineArn = stateMachineArn;
    this.stateMemoryInputSelector = stateMemoryInputSelector ?? null;
    this.useExternalMemoryInput = useExternalMemoryInput ?? false;
    this.workflowId = workflowId;
  }

  /**
   * @param {StartSyncWorkflowExecutionPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      input: actionPayload.input,
      state_machine_arn: actionPayload.stateMachineArn,
      state_memory_input_selector: actionPayload.stateMemoryInputSelector,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_input: actionPayload.useExternalMemoryInput,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
      workflow_id: actionPayload.workflowId,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new StartSyncWorkflowExecutionPayload({
      defaultOutput: normalized.default_output,
      input: normalized.input,
      stateMachineArn: normalized.state_machine_arn,
      stateMemoryInputSelector: normalized.state_memory_input_selector,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryInput: normalized.use_external_memory_input,
      useExternalMemoryOutput: normalized.use_external_memory_output,
      workflowId: normalized.workflow_id,
    });
  }
}

export default StartSyncWorkflowExecutionPayload;
