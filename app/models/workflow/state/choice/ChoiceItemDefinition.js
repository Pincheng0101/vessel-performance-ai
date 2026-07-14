import ChoiceItemCondition from './ChoiceItemCondition';

class ChoiceItemDefinition {
  constructor({
    comment,
    end,
    next,
    condition = new ChoiceItemCondition(),
  } = {}) {
    this.comment = comment;
    this.end = end;
    this.next = next;
    this.condition = new ChoiceItemCondition(condition);
  }

  static createFromAsl(asl) {
    if (!asl) return;
    return new ChoiceItemDefinition({
      condition: ChoiceItemCondition.createFromAsl(asl),
      end: asl.End,
      next: asl.Next,
      comment: asl.Comment,
    });
  }

  static toAsl(stateDefinition) {
    if (!stateDefinition) return;
    return objUtils.omit({
      ...ChoiceItemCondition.toAsl(stateDefinition.condition),
      End: stateDefinition.end,
      Next: stateDefinition.next,
      Comment: stateDefinition.comment,
    });
  }
}

export default ChoiceItemDefinition;
