import { StateDefinitionFactory } from '~/models/workflow/state';
import MapProcessorConfig from './MapProcessorConfig';

class MapItemProcessor {
  /**
   * @param {Object} params
   * @param {MapProcessorConfig} params.processorConfig
   */
  constructor({
    processorConfig,
    startAt,
    states = [],
  } = {}) {
    this.processorConfig = new MapProcessorConfig(processorConfig);
    this.startAt = startAt;
    this.states = states;
  }

  static toAsl(definition) {
    return {
      ProcessorConfig: MapProcessorConfig.toAsl(definition.processorConfig),
      StartAt: definition.startAt,
      States: definition.states.reduce((acc, state) => {
        acc[state.name] = StateDefinitionFactory.toAsl(state)[state.name];
        return acc;
      }, {}),
    };
  }

  static createFromAsl(asl) {
    return new MapItemProcessor({
      processorConfig: MapProcessorConfig.createFromAsl(asl.ProcessorConfig),
      startAt: asl.StartAt,
      states: Object.entries(asl.States || []).map(([name, state]) => StateDefinitionFactory.createFromAsl(name, state)),
    });
  }
}

export default MapItemProcessor;
