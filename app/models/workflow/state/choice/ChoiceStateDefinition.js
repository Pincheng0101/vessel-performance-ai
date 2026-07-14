import { StateConstant } from '~/constants';
import { StateDefinition } from '~/models/workflow/state';
import { ChoiceItem, ChoiceItemDefinition } from '~/models/workflow/state/choice';
import ChoiceInputOutput from './ChoiceInputOutput';

class ChoiceStateDefinition extends StateDefinition {
  type = StateConstant.Type.CHOICE.value;

  /**
   * @param {Object} params
   * @param {ChoiceInputOutput} params.inputOutput
   */
  constructor({
    name,
    comment,
    inputOutput,
    choices = [],
    defaultChoice,
  } = {}) {
    super({
      name,
      comment,
    });
    const defaultInputOutput = {
      inputPath: StateConstant.Type.CHOICE.defaultInputOutput.inputPath,
      outputPath: StateConstant.Type.CHOICE.defaultInputOutput.outputPath,
    };
    this.inputOutput = new ChoiceInputOutput(inputOutput || defaultInputOutput);
    this.choices = choices.map(choice => new ChoiceItem(choice));
    this.defaultChoice = defaultChoice;
  }

  /**
   * @param {ChoiceStateDefinition} stateDefinition
   */
  static toAsl(stateDefinition) {
    return {
      [stateDefinition.name]: objUtils.omit({
        Type: stateDefinition.type,
        Comment: stateDefinition.comment,
        InputPath: stateDefinition.inputOutput.inputPath,
        OutputPath: stateDefinition.inputOutput.outputPath,
        Choices: stateDefinition.choices.filter(choice => !choice.isDefault).map(choice => ChoiceItemDefinition.toAsl(choice.stateDefinition)),
        Default: stateDefinition.defaultChoice,
      }),
    };
  }

  /**
   * @param {String} name
   * @param {Object} definition
   */
  static createFromAsl(name, definition) {
    const choices = definition.Choices.map(choice => ChoiceItem.createFromAsl(choice));
    const defaultChoice = new ChoiceItem({
      id: strUtils.uuid(),
      sourceHandle: strUtils.uuid(),
      isDefault: true,
      stateDefinition: new ChoiceItemDefinition({
        end: definition.Default ? null : true,
        next: definition.Default,
      }),
    });
    choices.push(defaultChoice);
    return new ChoiceStateDefinition({
      name,
      comment: definition.Comment,
      inputOutput: new ChoiceInputOutput({
        inputPath: definition.InputPath,
        outputPath: definition.OutputPath,
      }),
      choices,
      defaultChoice: definition.Default,
    });
  }
}

export default ChoiceStateDefinition;
