import { StateConstant } from '~/constants';
import { ErrorHandling, ErrorHandlingCatch, ErrorHandlingRetry, StateDefinition } from '~/models/workflow/state';
import { ParametersFactory } from '~/models/workflow/state/task/parameters';
import TaskInputOutput from './TaskInputOutput';

class TaskStateDefinition extends StateDefinition {
  type = StateConstant.Type.TASK.value;

  /**
   * @param {Object} params
   * @param {TaskInputOutput} params.inputOutput
   * @param {Object} params.parameters
   */
  constructor({
    comment,
    end,
    errorHandling,
    inputOutput,
    name,
    next,
    parameters,
    resource,
  } = {}) {
    super({
      comment,
      name,
    });
    this.end = end;
    this.errorHandling = new ErrorHandling(errorHandling);
    this.inputOutput = new TaskInputOutput(inputOutput);
    this.next = next;
    this.parameters = ParametersFactory.create(resource, parameters);
    this.resource = resource || StateConstant.Resource.LAMBDA_INVOKE;
  }

  /**
   * @param {TaskStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    const omitted = {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Resource: stateDefinition.resource,
        Next: stateDefinition.next,
        End: stateDefinition.end,
        Comment: stateDefinition.comment,
        InputPath: stateDefinition.inputOutput.inputPath,
        ResultSelector: stateDefinition.inputOutput.resultSelector,
        ResultPath: stateDefinition.inputOutput.resultPath,
        OutputPath: stateDefinition.inputOutput.outputPath,
        Catch: stateDefinition.errorHandling?.catches.map(c => ErrorHandlingCatch.toAsl(c)),
        Retry: stateDefinition.errorHandling?.retries.map(r => ErrorHandlingRetry.toAsl(r)),
      }),
    };
    // Avoid parameters being omitted
    omitted[stateDefinition.name].Parameters = ParametersFactory.toAsl(stateDefinition.resource, stateDefinition.parameters);
    return omitted;
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new TaskStateDefinition({
      name,
      next: definition.Next,
      end: definition.End,
      comment: definition.Comment,
      inputOutput: new TaskInputOutput({
        inputPath: definition.InputPath,
        resultSelector: definition.ResultSelector,
        resultPath: definition.ResultPath,
        outputPath: definition.OutputPath,
      }),
      parameters: ParametersFactory.createFromAsl(definition.Resource, definition.Parameters),
      resource: definition.Resource,
      errorHandling: new ErrorHandling({
        catches: definition.Catch?.map(ErrorHandlingCatch.createFromAsl),
        retries: definition.Retry?.map(ErrorHandlingRetry.createFromAsl),
      }),
    });
  }
}

export default TaskStateDefinition;
