import ChoiceItemExpression from './ChoiceItemExpression';

class ChoiceItemFormData {
  constructor({
    conditionalStatement = '',
    expressions = [new ChoiceItemExpression()],
  } = {}) {
    this.conditionalStatement = conditionalStatement;
    this.expressions = expressions;
  }
}

export default ChoiceItemFormData;
