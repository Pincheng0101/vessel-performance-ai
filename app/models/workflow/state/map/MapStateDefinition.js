import { StateConstant } from '~/constants';
import { ErrorHandling, ErrorHandlingCatch, ErrorHandlingRetry } from '~/models/workflow/state';
import MapInputOutput from './MapInputOutput';
import MapItemProcessor from './MapItemProcessor';

class MapStateDefinition {
  type = StateConstant.Type.MAP.value;

  /**
   * @param {Object} params
   * @param {MapItemProcessor} params.itemProcessor
   * @param {MapInputOutput} params.inputOutput
   */
  constructor({
    name,
    next,
    end,
    errorHandling,
    comment,
    itemProcessor,
    itemsPath,
    itemSelector,
    maxConcurrency,
    inputOutput,
  } = {}) {
    const defaultInputOutput = {
      inputPath: StateConstant.Type.MAP.defaultInputOutput.inputPath,
      resultSelector: StateConstant.Type.MAP.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.Type.MAP.defaultInputOutput.outputPath,
    };
    this.name = name;
    this.next = next;
    this.end = end;
    this.errorHandling = new ErrorHandling(errorHandling);
    this.comment = comment;
    this.itemProcessor = new MapItemProcessor(itemProcessor);
    this.itemsPath = itemsPath;
    this.itemSelector = itemSelector;
    this.maxConcurrency = maxConcurrency;
    this.inputOutput = new MapInputOutput(inputOutput || defaultInputOutput);
  }

  /**
   * @param {MapStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Next: stateDefinition.next,
        End: stateDefinition.end,
        Comment: stateDefinition.comment,
        ItemProcessor: MapItemProcessor.toAsl(stateDefinition.itemProcessor),
        ItemsPath: stateDefinition.itemsPath,
        ItemSelector: stateDefinition.itemSelector,
        MaxConcurrency: stateDefinition.maxConcurrency,
        InputPath: stateDefinition.inputOutput.inputPath,
        ResultSelector: stateDefinition.inputOutput.resultSelector,
        ResultPath: stateDefinition.inputOutput.resultPath,
        OutputPath: stateDefinition.inputOutput.outputPath,
        Catch: stateDefinition.errorHandling?.catches.map(c => ErrorHandlingCatch.toAsl(c)),
        Retry: stateDefinition.errorHandling?.retries.map(r => ErrorHandlingRetry.toAsl(r)),
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new MapStateDefinition({
      name,
      next: definition.Next,
      end: definition.End,
      comment: definition.Comment,
      itemProcessor: MapItemProcessor.createFromAsl(definition.ItemProcessor),
      itemsPath: definition.ItemsPath,
      itemSelector: definition.ItemSelector,
      maxConcurrency: definition.MaxConcurrency,
      inputOutput: new MapInputOutput({
        inputPath: definition.InputPath,
        resultSelector: definition.ResultSelector,
        resultPath: definition.ResultPath,
        outputPath: definition.OutputPath,
      }),
      errorHandling: new ErrorHandling({
        catches: definition.Catch?.map(ErrorHandlingCatch.createFromAsl),
        retries: definition.Retry?.map(ErrorHandlingRetry.createFromAsl),
      }),
    });
  }
}

export default MapStateDefinition;
