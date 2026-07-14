import { StateConstant, StructuredLlmConstant } from '~/constants';
import { LlmActionExecutionPayloadFactory, LlmActionExecutionPayloadResponseFactory } from '~/models/server/llm';
import { RetryActionExecutionPayload, RetryActionExecutionPayloadResponse } from '~/models/server/retry';
import TaskPayload from '~/models/workflow/state/task/TaskPayload';
import TaskStreamingConfig from '~/models/workflow/state/task/TaskStreamingConfig';
import StructuredLlmDefaultOutput from './StructuredLlmDefaultOutput';

/**
 * @import { LlmActionExecutionPayload } from '~/models/server/llm'
 * @import { RetryActionExecutionPayload } from '~/models/server/retry'
 */

class StructuredLlmPayload extends TaskPayload {
  actionType = StateConstant.ActionType.STRUCTURED_LLM.value;

  /**
   * @param {boolean} params.useExternalMemoryOutput
   * @param {LlmActionExecutionPayload} params.llm
   * @param {Object} params
   * @param {Object} params.stateMemoryOutputSelector
   * @param {RetryActionExecutionPayload} params.retry
   * @param {StructuredLlmDefaultOutput} params.defaultOutput
   * @param {TaskStreamingConfig} params.streamingConfig
   */
  constructor({
    defaultOutput,
    llm,
    fallbackLlms,
    retry,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    super({
      defaultOutput: (() => {
        if (!defaultOutput) return null;
        if (referencePathUtils.isReferencePath(defaultOutput)) return defaultOutput;
        return new StructuredLlmDefaultOutput(defaultOutput);
      })(),
      stateMemoryOutputSelector,
      streamingConfig,
      useExternalMemoryOutput,
    });
    this.llm = (() => {
      if (!llm) return {};
      if (referencePathUtils.isReferencePath(llm)) return llm;
      return LlmActionExecutionPayloadFactory.create({
        ...llm,
        jsonSchema: llm.jsonSchema ?? StructuredLlmConstant.ActionExecutionParams.JSON_SCHEMA,
        guardrailVersion: llm.guardrailVersion ?? StructuredLlmConstant.ActionExecutionParams.GUARDRAILS.version,
      });
    })();
    this.fallbackLlms = (() => {
      if (referencePathUtils.isReferencePath(fallbackLlms)) return fallbackLlms;
      if (!Array.isArray(fallbackLlms)) return [];
      return fallbackLlms.map(fallbackLlm => LlmActionExecutionPayloadFactory.create(fallbackLlm) || []);
    })();
    this.retry = retry ? new RetryActionExecutionPayload(retry) : retry;
  }

  /**
   * @param {StructuredLlmPayload} actionPayload
   */
  static toRequestPayload(actionPayload) {
    return {
      action_type: actionPayload.actionType,
      default_output: actionPayload.defaultOutput,
      llm: (() => {
        if (!actionPayload.llm) return {};
        if (referencePathUtils.isReferencePath(actionPayload.llm)) return actionPayload.llm;
        return LlmActionExecutionPayloadFactory.toRequestPayload(actionPayload.llm);
      })(),
      fallback_llms: (() => {
        if (!actionPayload.fallbackLlms) return [];
        if (referencePathUtils.isReferencePath(actionPayload.fallbackLlms)) return actionPayload.fallbackLlms;
        if (!Array.isArray(actionPayload.fallbackLlms)) return [];
        return actionPayload.fallbackLlms.map(fallbackLlm => LlmActionExecutionPayloadFactory.toRequestPayload(fallbackLlm));
      })(),
      retry: actionPayload.retry ? RetryActionExecutionPayload.toRequestPayload(actionPayload.retry) : actionPayload.retry,
      state_memory_output_selector: actionPayload.stateMemoryOutputSelector,
      streaming_config: (() => {
        if (!actionPayload.streamingConfig) return null;
        if (referencePathUtils.isReferencePath(actionPayload.streamingConfig)) return actionPayload.streamingConfig;
        return TaskStreamingConfig.toRequestPayload(actionPayload.streamingConfig);
      })(),
      use_external_memory_output: actionPayload.useExternalMemoryOutput,
    };
  }

  static createFromAsl(asl) {
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new StructuredLlmPayload({
      defaultOutput: normalized.default_output,
      llm: (() => {
        if (!normalized.llm) return {};
        if (referencePathUtils.isReferencePath(normalized.llm)) return normalized.llm;
        return LlmActionExecutionPayloadResponseFactory.create(normalized.llm);
      })(),
      fallbackLlms: (() => {
        if (!normalized.fallback_llms) return [];
        if (referencePathUtils.isReferencePath(normalized.fallback_llms)) return normalized.fallback_llms;
        if (!Array.isArray(normalized.fallback_llms)) return [];
        return normalized.fallback_llms.map(fallbackLlm => LlmActionExecutionPayloadResponseFactory.create(fallbackLlm));
      })(),
      retry: normalized.retry ? new RetryActionExecutionPayloadResponse(normalized.retry) : normalized.retry,
      stateMemoryOutputSelector: normalized.state_memory_output_selector,
      streamingConfig: (() => {
        if (!normalized.streaming_config) return null;
        if (referencePathUtils.isReferencePath(normalized.streaming_config)) return normalized.streaming_config;
        return TaskStreamingConfig.createFromAsl(normalized.streaming_config);
      })(),
      useExternalMemoryOutput: normalized.use_external_memory_output,
    });
  }
}

export default StructuredLlmPayload;
