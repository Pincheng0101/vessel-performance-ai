import { StateConstant } from '~/constants';
import { StateDefinition } from '~/models/workflow/state';
import WaitInputOutput from './WaitInputOutput';

class WaitStateDefinition extends StateDefinition {
  type = StateConstant.Type.WAIT.value;

  /**
   * @param {Object} params
   * @param {WaitInputOutput} params.inputOutput
   */
  constructor({
    comment,
    end,
    inputOutput,
    name,
    next,
    seconds,
    secondsPath,
    timestamp,
    timestampPath,
  } = {}) {
    super({
      name,
      comment,
    });
    const defaultInputOutput = {
      inputPath: StateConstant.Type.WAIT.defaultInputOutput.inputPath,
      outputPath: StateConstant.Type.WAIT.defaultInputOutput.outputPath,
    };
    this.end = end;
    this.inputOutput = new WaitInputOutput(inputOutput || defaultInputOutput);
    this.next = next;
    this.seconds = seconds;
    this.secondsPath = secondsPath;
    this.timestamp = timestamp;
    this.timestampPath = timestampPath;
  }

  /**
   * @param {WaitStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Next: stateDefinition.next,
        End: stateDefinition.end,
        Comment: stateDefinition.comment,
        Seconds: stateDefinition.seconds,
        SecondsPath: stateDefinition.secondsPath,
        Timestamp: stateDefinition.timestamp,
        TimestampPath: stateDefinition.timestampPath,
        InputPath: stateDefinition.inputOutput.inputPath,
        OutputPath: stateDefinition.inputOutput.outputPath,
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    return new WaitStateDefinition({
      name,
      next: definition.Next,
      end: definition.End,
      comment: definition.Comment,
      inputOutput: new WaitInputOutput({
        inputPath: definition.InputPath,
        outputPath: definition.OutputPath,
      }),
      seconds: definition.Seconds,
      secondsPath: definition.SecondsPath,
      timestamp: definition.Timestamp,
      timestampPath: definition.TimestampPath,
    });
  }
}

export default WaitStateDefinition;
