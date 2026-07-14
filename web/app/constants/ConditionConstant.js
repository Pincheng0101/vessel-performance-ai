const ConditionalStatement = Object.freeze({
  SIMPLE: { title: 'Simple', value: 'simple' },
  AND: { title: 'AND', value: 'and' },
  OR: { title: 'OR', value: 'or' },
});

const Operator = Object.freeze({
  IS_PRESENT: { title: 'is present', value: 'isPresent' },
  IS_OF_TYPE: { title: 'is of type', value: 'isOfType' },
  IS_EQUAL_TO: { title: 'is equal to', value: 'isEqualTo' },
  IS_LESS_THAN: { title: 'is less than', value: 'isLessThan' },
  IS_GREATER_THAN: { title: 'is greater than', value: 'isGreaterThan' },
  IS_LESS_THAN_OR_EQUAL_TO: { title: 'is less than or equal to', value: 'isLessThanOrEqualTo' },
  IS_GREATER_THAN_OR_EQUAL_TO: { title: 'is greater than or equal to', value: 'isGreaterThanOrEqualTo' },
  MATCHES_STRING: { title: 'matches string', value: 'matchesString' },
});

const BasicType = Object.freeze({
  NUMBER: { title: 'Number', value: 'number' },
  TIMESTAMP: { title: 'Timestamp', value: 'timestamp' },
  STRING: { title: 'String', value: 'string' },
  BOOLEAN: { title: 'Boolean', value: 'boolean' },
  NULL: { title: 'Null', value: 'null' },
});

const DetailedType = Object.freeze({
  NUMBER_CONSTANT: { title: 'Number Constant', value: 'numberConstant' },
  NUMBER_VARIABLE: { title: 'Number Variable', value: 'numberVariable' },
  TIMESTAMP_CONSTANT: { title: 'Timestamp Constant', value: 'timestampConstant' },
  TIMESTAMP_VARIABLE: { title: 'Timestamp Variable', value: 'timestampVariable' },
  STRING_CONSTANT: { title: 'String Constant', value: 'stringConstant' },
  STRING_VARIABLE: { title: 'String Variable', value: 'stringVariable' },
  BOOLEAN_CONSTANT: { title: 'Boolean Constant', value: 'booleanConstant' },
  BOOLEAN_VARIABLE: { title: 'Boolean Variable', value: 'booleanVariable' },
});

const Boolean = Object.freeze({
  TRUE: { title: 'true', value: true },
  FALSE: { title: 'false', value: false },
});

const NotCondition = Object.freeze({
  NOT: { title: 'Not', value: 'not' },
});

const OperatorMap = Object.freeze({
  [Operator.IS_PRESENT.value]: exp => `is ${exp.value ? '' : 'not '}present`,
  [Operator.IS_OF_TYPE.value]: exp => ({
    [BasicType.NUMBER.value]: `is ${exp.value ? '' : 'not '}numeric`,
    [BasicType.TIMESTAMP.value]: `is ${exp.value ? '' : 'not '}timestamp`,
    [BasicType.STRING.value]: `is ${exp.value ? '' : 'not '}string`,
    [BasicType.BOOLEAN.value]: `is ${exp.value ? '' : 'not '}boolean`,
    [BasicType.NULL.value]: `is ${exp.value ? '' : 'not '}null`,
  }[exp.valueType]),
  [Operator.IS_EQUAL_TO.value]: exp => `== ${exp.valueType.toLowerCase().includes('string') ? `"${exp.value}"` : exp.value}`,
  [Operator.IS_LESS_THAN.value]: exp => `< ${exp.valueType.toLowerCase().includes('string') ? `"${exp.value}"` : exp.value}`,
  [Operator.IS_GREATER_THAN.value]: exp => `> ${exp.valueType.toLowerCase().includes('string') ? `"${exp.value}"` : exp.value}`,
  [Operator.IS_GREATER_THAN_OR_EQUAL_TO.value]: exp => `>= ${exp.valueType.toLowerCase().includes('string') ? `"${exp.value}"` : exp.value}`,
  [Operator.IS_LESS_THAN_OR_EQUAL_TO.value]: exp => `<= ${exp.valueType.toLowerCase().includes('string') ? `"${exp.value}"` : exp.value}`,
  [Operator.MATCHES_STRING.value]: exp => `~= "${exp.value}"`,
});

export {
  BasicType,
  Boolean,
  ConditionalStatement,
  DetailedType,
  NotCondition,
  Operator,
  OperatorMap,
};
