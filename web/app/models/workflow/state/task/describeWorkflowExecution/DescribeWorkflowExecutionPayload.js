import { StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import DescribeWorkflowExecutionDefaultOutput from './DescribeWorkflowExecutionDefaultOutput';

class DescribeWorkflowExecutionPayload extends TaskPayload {
  actionType = StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {DescribeWorkflowExecutionDefaultOutput} params.defaultOutput
   * @param {Object} params
   * @param {string} params.executionArn
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    executionArn,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new DescribeWorkflowExecutionDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.executionArn = executionArn;
  }

  /**
   * @param {DescribeWorkflowExecutionPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      execution_arn: actionPayload.executionArn,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new DescribeWorkflowExecutionPayload({
      defaultOutput: normalized.default_output,
      executionArn: normalized.execution_arn,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default DescribeWorkflowExecutionPayload;
