import { StateConstant } from '~/constants';
import { StateDefinition } from '~/models/workflow/state';
import PassInputOutput from './PassInputOutput';

class PassStateDefinition extends StateDefinition {
  type = StateConstant.Type.PASS.value;

  /**
   * @param {Object} params
   * @param {PassInputOutput} params.inputOutput
   */
  constructor({
    comment,
    end,
    inputOutput,
    name,
    next,
  } = {}) {
    super({
      name,
      comment,
    });
    const defaultInputOutput = {
      inputPath: StateConstant.Type.PASS.defaultInputOutput.inputPath,
      parameters: StateConstant.Type.PASS.defaultInputOutput.parameters,
      result: StateConstant.Type.PASS.defaultInputOutput.result,
      resultPath: `${StateConstant.DefaultResultPathPrefix}${name}${StateConstant.DefaultResultPathSuffix}`,
      outputPath: StateConstant.Type.PASS.defaultInputOutput.outputPath,
    };
    this.end = end;
    this.inputOutput = new PassInputOutput(inputOutput || defaultInputOutput);
    this.next = next;
  }

  /**
   * @param {PassStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Next: stateDefinition.next,
        End: stateDefinition.end,
        Comment: stateDefinition.comment,
        InputPath: stateDefinition.inputOutput.inputPath,
        Parameters: stateDefinition.inputOutput.parameters,
        Result: stateDefinition.inputOutput.result,
        ResultPath: stateDefinition.inputOutput.resultPath,
        OutputPath: stateDefinition.inputOutput.outputPath,
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new PassStateDefinition({
      name,
      next: definition.Next,
      end: definition.End,
      comment: definition.Comment,
      inputOutput: new PassInputOutput({
        inputPath: definition.InputPath,
        parameters: definition.Parameters,
        result: definition.Result,
        resultPath: definition.ResultPath,
        outputPath: definition.OutputPath,
      }),
    });
  }
}

export default PassStateDefinition;
