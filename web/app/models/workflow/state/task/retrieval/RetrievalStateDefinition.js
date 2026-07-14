import { StateConstant } from '~/constants';
import { ErrorHandling } from '~/models/workflow/state';
import TaskInputOutput from '~/models/workflow/state/task/TaskInputOutput';
import TaskStateDefinition from '~/models/workflow/state/task/TaskStateDefinition';
import RetrievalParameters from './RetrievalParameters';

class RetrievalStateDefinition extends TaskStateDefinition {
  /**
   * @param {Object} params
   * @param {TaskInputOutput} params.inputOutput
   * @param {RetrievalParameters} params.parameters
   */
  constructor({
    comment,
    end,
    errorHandling,
    inputOutput,
    name,
    next,
    parameters,
  } = {}) {
    const defaultInputOutput = {
      inputPath: StateConstant.ActionType.RETRIEVAL.defaultInputOutput.inputPath,
      resultSelector: StateConstant.ActionType.RETRIEVAL.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.ActionType.RETRIEVAL.defaultInputOutput.outputPath,
    };
    super({
      comment,
      end,
      errorHandling: new ErrorHandling(errorHandling),
      inputOutput: new TaskInputOutput(inputOutput || defaultInputOutput),
      name,
      next,
    });
    this.parameters = new RetrievalParameters(parameters);
  }
}

export default RetrievalStateDefinition;
