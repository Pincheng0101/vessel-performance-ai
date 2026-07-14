class TaskStreamingPhaseConfig {
  constructor({
    name,
    outputSelector,
  } = {}) {
    this.name = name ?? null;
    this.outputSelector = outputSelector ?? null;
  }

  static toRequestPayload(payload) {
    if (!payload) return null;
    if (referencePathUtils.isReferencePath(payload)) return payload;
    return {
      name: payload.name,
      output_selector: payload.outputSelector,
    };
  }

  static createFromAsl(asl) {
    if (!asl) return null;
    const normalized = referencePathUtils.removeSuffixes(asl);
    return new TaskStreamingPhaseConfig({
      name: normalized.name,
      outputSelector: normalized.output_selector,
    });
  }
}

export default TaskStreamingPhaseConfig;
