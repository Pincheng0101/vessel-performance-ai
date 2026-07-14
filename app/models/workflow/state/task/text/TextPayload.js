import { StateConstant, TextConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import TextDefaultOutput from './TextDefaultOutput';

class TextPayload extends TaskPayload {
  actionType = StateConstant.ActionType.TEXT.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {Object} params.variables
   * @param {string} params.template
   * @param {TaskStreamingConfig} params.streamingConfig
   * @param {TextDefaultOutput} params.defaultOutput
   */
  constructor({
    defaultOutput,
    stateMemoryOutputSelector,
    template,
    useExternalMemoryOutput,
    variables,
    streamingConfig,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (jsonPathUtils.isJsonPath(defaultOutput)) return defaultOutput;
        return new TextDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.template = template ?? TextConstant.ActionExecutionParams.TEMPLATE;
    this.variables = variables ?? TextConstant.ActionExecutionParams.VARIABLES;
  }

  /**
   * @param {TextPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: jsonPathUtils.isJsonPath(actionPayload.streamingConfig) ? actionPayload.streamingConfig : TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig),
      template: actionPayload.template,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
      variables: actionPayload.variables,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new TextPayload({
      defaultOutput: normalized.default_output,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: jsonPathUtils.isJsonPath(normalized.streaming_config) ? normalized.streaming_config : TaskStreamingConfig.createFromAsl(normalized.streaming_config),
      template: normalized.template,
      useExternalMemoryOutput: normalized.use_external_memory_output,
      variables: normalized.variables,
    });
  }
}

export default TextPayload;
