import { StateConstant } from '~/constants';
import { ErrorHandling } from '~/models/workflow/state';
import TaskInputOutput from '~/models/workflow/state/task/TaskInputOutput';
import TaskStateDefinition from '~/models/workflow/state/task/TaskStateDefinition';
import DescribeWorkflowExecutionParameters from './DescribeWorkflowExecutionParameters';

class DescribeWorkflowExecutionStateDefinition extends TaskStateDefinition {
  /**
   * @param {Object} params
   * @param {TaskInputOutput} params.inputOutput
   * @param {DescribeWorkflowExecutionParameters} params.parameters
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
      inputPath: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.defaultInputOutput.inputPath,
      resultSelector: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.defaultInputOutput.outputPath,
    };
    super({
      comment,
      end,
      errorHandling: new ErrorHandling(errorHandling),
      inputOutput: new TaskInputOutput(inputOutput || defaultInputOutput),
      name,
      next,
    });
    this.parameters = new DescribeWorkflowExecutionParameters(parameters);
  }
}

export default DescribeWorkflowExecutionStateDefinition;
