import { Runtime } from '~/models/server';

class WorkflowCronExecution extends Runtime {
  constructor({
    workflowCronId,
    executionTs,
    executionArn,
    workflowId,
    status,
    error,
    updatedTs,
    ttl,
  } = {}) {
    super({
      status,
      updatedTs,
    });
    this.workflowCronId = workflowCronId ?? '';
    this.executionTs = executionTs ?? null;
    this.executionArn = executionArn ?? null;
    this.workflowId = workflowId ?? '';
    this.error = error ?? null;
    this.ttl = ttl ?? null;
  }

  get id() {
    if (this.executionArn) return this.executionArn;
    return `${this.workflowCronId}_${this.executionTs}`;
  }
}

export default WorkflowCronExecution;
