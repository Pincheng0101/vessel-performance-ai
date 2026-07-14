class ChoiceItemExpression {
  constructor({
    not,
    operator,
    value,
    valueType,
    variable,
  } = {}) {
    this.not = not ?? '';
    this.operator = operator ?? '';
    this.value = value ?? '';
    this.valueType = valueType ?? '';
    this.variable = variable ?? '';
  }
}

export default ChoiceItemExpression;
