import { StateConstant } from '~/constants';
import { ErrorHandling, ErrorHandlingCatch, ErrorHandlingRetry } from '~/models/workflow/state';
import ParallelBranch from './ParallelBranch';
import ParallelInputOutput from './ParallelInputOutput';

class ParallelStateDefinition {
  type = StateConstant.Type.PARALLEL.value;

  /**
   * @param {Object} params
   * @param {ParallelBranch[]} params.branches
   * @param {ParallelInputOutput} params.inputOutput
   */
  constructor({
    name,
    next,
    end,
    errorHandling,
    comment,
    branches,
    inputOutput,
  } = {}) {
    const defaultInputOutput = {
      inputPath: StateConstant.Type.PARALLEL.defaultInputOutput.inputPath,
      parameters: StateConstant.Type.PARALLEL.defaultInputOutput.parameters,
      resultSelector: StateConstant.Type.PARALLEL.defaultInputOutput.resultSelector,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.Type.PARALLEL.defaultInputOutput.outputPath,
    };
    this.name = name;
    this.next = next;
    this.end = end;
    this.errorHandling = new ErrorHandling(errorHandling);
    this.comment = comment;
    this.branches = branches ? branches.map(branch => new ParallelBranch(branch)) : [];
    this.inputOutput = new ParallelInputOutput(inputOutput || defaultInputOutput);
  }

  /**
   * @param {ParallelStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Next: stateDefinition.next,
        End: stateDefinition.end,
        Comment: stateDefinition.comment,
        Branches: stateDefinition.branches.map(branch => ParallelBranch.toAsl(branch)),
        InputPath: stateDefinition.inputOutput.inputPath,
        Parameters: stateDefinition.inputOutput.parameters,
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
    return new ParallelStateDefinition({
      name,
      next: definition.Next,
      end: definition.End,
      comment: definition.Comment,
      branches: definition.Branches.map(branch => ParallelBranch.createFromAsl(branch)),
      inputOutput: new ParallelInputOutput({
        inputPath: definition.InputPath,
        parameters: definition.Parameters,
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

export default ParallelStateDefinition;
