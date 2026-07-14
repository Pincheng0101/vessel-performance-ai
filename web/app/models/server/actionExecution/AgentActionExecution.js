import AgentPayload from '~/models/workflow/state/task/agent/AgentPayload';
import ActionExecution from './ActionExecution';

class AgentActionExecution extends ActionExecution {
  constructor({
    actionOutput,
    cause,
    error,
    executionArn,
    startTs,
    status,
    stopTs,
  } = {}) {
    super({
      actionOutput,
      cause,
      error,
      executionArn,
      startTs,
      status,
      stopTs,
    });
  }

  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  }) {
    return referencePathUtils.addSuffixes({
      action: AgentPayload.toRequestPayload(actionPayload),
      external_memory_input: externalMemoryInput,
      input,
    });
  }
}

export default AgentActionExecution;
