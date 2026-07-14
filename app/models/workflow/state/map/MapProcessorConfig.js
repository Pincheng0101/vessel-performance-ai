import { StateConstant } from '~/constants';

class MapProcessorConfig {
  constructor({
    mode = StateConstant.MapProcessorConfigMode.INLINE, // TODO: The UI only supports INLINE mode for now
  } = {}) {
    this.mode = mode;
  }

  static toAsl(definition) {
    return {
      Mode: definition.mode,
    };
  }

  static createFromAsl(asl) {
    return new MapProcessorConfig({
      mode: asl.Mode,
    });
  }
}

export default MapProcessorConfig;
