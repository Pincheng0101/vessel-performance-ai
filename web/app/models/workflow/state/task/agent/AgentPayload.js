import { AgentConstant, StateConstant } from '~/constants';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import AgentDefaultOutput from './AgentDefaultOutput';

class AgentPayload extends TaskPayload {
  actionType = StateConstant.ActionType.AGENT.value;

  static normalizePromptVariables(promptVariables) {
    return (promptVariables === null || promptVariables === undefined || objUtils.isEmpty(promptVariables))
      ? null
      : promptVariables;
  }

  constructor({
    agentId,
    defaultOutput,
    llmId,
    maxIterations,
    outputSchema,
    prompt,
    promptVariables,
    sessionId,
    stateMemoryOutputSelector,
    storageId,
    streamingConfig,
    structuredLlmId,
    useExternalMemoryOutput,
    wsIdleTimeout,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (referencePathUtils.isReferencePath(defaultOutput)) return defaultOutput;
        return new AgentDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.agentId = agentId;
    this.llmId = llmId ?? null;
    this.maxIterations = maxIterations ?? AgentConstant.ActionExecutionParams.MAX_ITERATIONS.default;
    this.outputSchema = outputSchema ?? null;
    this.prompt = strUtils.isEmpty(prompt) ? null : prompt;
    this.promptVariables = AgentPayload.normalizePromptVariables(promptVariables);
    this.sessionId = sessionId ?? null;
    this.storageId = storageId ?? null;
    this.structuredLlmId = structuredLlmId ?? null;
    this.wsIdleTimeout = wsIdleTimeout ?? AgentConstant.ActionExecutionParams.WS_IDLE_TIMEOUT.default;
  }

  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      agent_id: actionPayload.agentId,
      default_output: actionPayload.defaultOutput,
      llm_id: actionPayload.llmId,
      max_iterations: actionPayload.maxIterations,
      output_schema: actionPayload.outputSchema,
      prompt: strUtils.isEmpty(actionPayload.prompt) ? null : actionPayload.prompt,
      prompt_variables: AgentPayload.normalizePromptVariables(actionPayload.promptVariables),
      session_id: actionPayload.sessionId,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      storage_id: actionPayload.storageId,
      streaming_config: (() => {
        if (!actionPayload.streamingConfig) return null;
        if (referencePathUtils.isReferencePath(actionPayload.streamingConfig)) return actionPayload.streamingConfig;
        return TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig);
      })(),
      structured_llm_id: actionPayload.structuredLlmId,
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
      ws_idle_timeout: actionPayload.wsIdleTimeout,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new AgentPayload({
      agentId: normalized.agent_id,
      defaultOutput: normalized.default_output,
      llmId: normalized.llm_id,
      maxIterations: normalized.max_iterations,
      outputSchema: normalized.output_schema,
      prompt: normalized.prompt,
      promptVariables: normalized.prompt_variables,
      sessionId: normalized.session_id,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      storageId: normalized.storage_id,
      streamingConfig: (() => {
        if (!normalized.streaming_config) return null;
        if (referencePathUtils.isReferencePath(normalized.streaming_config)) return normalized.streaming_config;
        return TaskStreamingConfig.createFromAsl(normalized.streaming_config);
      })(),
      structuredLlmId: normalized.structured_llm_id,
      useExternalMemoryOutput: normalized.use_external_memory_output,
      wsIdleTimeout: normalized.ws_idle_timeout,
    });
  }
}

export default AgentPayload;
