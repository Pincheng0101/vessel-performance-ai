import { StateConstant } from '~/constants';
import { ErrorHandling } from '~/models/workflow/state';
import TaskInputOutput from '~/models/workflow/state/task/TaskInputOutput';
import TaskStateDefinition from '~/models/workflow/state/task/TaskStateDefinition';
import StructuredLlmParameters from './StructuredLlmParameters';

class StructuredLlmStateDefinition extends TaskStateDefinition {
  /**
   * @param {Object} params
   * @param {TaskInputOutput} params.inputOutput
   * @param {StructuredLlmParameters} params.parameters
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
      inputPath: StateConstant.ActionType.STRUCTURED_LLM.defaultInputOutput.inputPath,
      resultSelector: StateConstant.ActionType.STRUCTURED_LLM.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.ActionType.STRUCTURED_LLM.defaultInputOutput.outputPath,
    };
    super({
      comment,
      end,
      errorHandling: new ErrorHandling(errorHandling),
      inputOutput: new TaskInputOutput(inputOutput || defaultInputOutput),
      name,
      next,
    });
    this.parameters = new StructuredLlmParameters(parameters);
  }
}

export default StructuredLlmStateDefinition;
