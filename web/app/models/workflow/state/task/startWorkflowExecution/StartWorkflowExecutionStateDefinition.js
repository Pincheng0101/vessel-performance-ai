import { StateConstant } from '~/constants';
import { ErrorHandling } from '~/models/workflow/state';
import TaskInputOutput from '~/models/workflow/state/task/TaskInputOutput';
import TaskStateDefinition from '~/models/workflow/state/task/TaskStateDefinition';
import StartWorkflowExecutionParameters from './StartWorkflowExecutionParameters';

class StartWorkflowExecutionStateDefinition extends TaskStateDefinition {
  /**
   * @param {Object} params
   * @param {TaskInputOutput} params.inputOutput
   * @param {StartWorkflowExecutionParameters} params.parameters
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
      inputPath: StateConstant.ActionType.START_WORKFLOW_EXECUTION.defaultInputOutput.inputPath,
      resultSelector: StateConstant.ActionType.START_WORKFLOW_EXECUTION.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.ActionType.START_WORKFLOW_EXECUTION.defaultInputOutput.outputPath,
    };
    super({
      comment,
      end,
      errorHandling: new ErrorHandling(errorHandling),
      inputOutput: new TaskInputOutput(inputOutput || defaultInputOutput),
      name,
      next,
    });
    this.parameters = new StartWorkflowExecutionParameters(parameters);
  }
}

export default StartWorkflowExecutionStateDefinition;
