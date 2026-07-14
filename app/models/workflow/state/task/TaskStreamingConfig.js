import TaskStreamingPhaseConfig from './TaskStreamingPhaseConfig.js';

class TaskStreamingConfig {
  constructor({
    beforeAction,
    afterAction,
  } = {}) {
    this.beforeAction = (() => {
      if (!beforeAction) return null;
      if (referencePathUtils.isReferencePath(beforeAction)) return beforeAction;
      return new TaskStreamingPhaseConfig(beforeAction);
    })();
    this.afterAction = (() => {
      if (!afterAction) return null;
      if (referencePathUtils.isReferencePath(afterAction)) return afterAction;
      return new TaskStreamingPhaseConfig(afterAction);
    })();
  }

  static toRequestPayload(payload) {
    if (!payload) return null;
    return {
      before_action: TaskStreamingPhaseConfig.toRequestPayload(payload.beforeAction),
      after_action: TaskStreamingPhaseConfig.toRequestPayload(payload.afterAction),
    };
  }

  static createFromAsl(asl) {
    if (!asl) return null;
    const normalized = referencePathUtils.removeSuffixes(asl);
    // Backward compatibility for legacy data structure
    const hasLegacyKeys = ['name', 'outputSelector'].some(key => Object.hasOwn(normalized, key));
    if (hasLegacyKeys) {
      return new TaskStreamingConfig({
        beforeAction: null,
        afterAction: new TaskStreamingPhaseConfig({
          name: normalized?.name,
          outputSelector: normalized?.output_selector,
        }),
      });
    }
    return new TaskStreamingConfig({
      beforeAction: normalized.before_action
        ? new TaskStreamingPhaseConfig({
            name: normalized.before_action?.name,
            outputSelector: normalized.before_action?.output_selector,
          })
        : null,
      afterAction: normalized.after_action
        ? new TaskStreamingPhaseConfig({
            name: normalized.after_action?.name,
            outputSelector: normalized.after_action?.output_selector,
          })
        : null,
    });
  }
}

export default TaskStreamingConfig;
