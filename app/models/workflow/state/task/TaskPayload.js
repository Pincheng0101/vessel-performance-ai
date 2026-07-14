import TaskStreamingConfig from './TaskStreamingConfig';

class TaskPayload {
  constructor({
    defaultOutput,
    stateMemoryOutputSelector,
    streamingConfig,
    useExternalMemoryOutput,
  } = {}) {
    this.defaultOutput = defaultOutput;
    this.stateMemoryOutputSelector = stateMemoryOutputSelector ?? null;
    this.streamingConfig = (() => {
      if (!streamingConfig) return null;
      if (referencePathUtils.isReferencePath(streamingConfig)) return streamingConfig;
      return new TaskStreamingConfig(streamingConfig);
    })();
    this.useExternalMemoryOutput = useExternalMemoryOutput ?? false;
  }
}

export default TaskPayload;
