import { ConditionConstant } from '~/constants';
import ChoiceItemExpression from './ChoiceItemExpression';
import ChoiceItemFormData from './ChoiceItemFormData';

class ChoiceItemCondition {
  constructor({
    variable,
    isPresent,
    isNumeric,
    isString,
    isBoolean,
    isTimestamp,
    isNull,
    numericEquals,
    stringEquals,
    timestampEquals,
    booleanEquals,
    numericEqualsPath,
    stringEqualsPath,
    timestampEqualsPath,
    booleanEqualsPath,
    numericLessThan,
    stringLessThan,
    timestampLessThan,
    numericLessThanPath,
    stringLessThanPath,
    timestampLessThanPath,
    numericGreaterThan,
    stringGreaterThan,
    timestampGreaterThan,
    numericGreaterThanPath,
    stringGreaterThanPath,
    timestampGreaterThanPath,
    numericGreaterThanEquals,
    stringGreaterThanEquals,
    timestampGreaterThanEquals,
    numericGreaterThanEqualsPath,
    stringGreaterThanEqualsPath,
    timestampGreaterThanEqualsPath,
    numericLessThanEquals,
    stringLessThanEquals,
    timestampLessThanEquals,
    numericLessThanEqualsPath,
    stringLessThanEqualsPath,
    timestampLessThanEqualsPath,
    stringMatches,
    and,
    or,
    not,
  } = {}) {
    this.variable = variable;
    this.isPresent = isPresent;
    this.isNumeric = isNumeric;
    this.isString = isString;
    this.isBoolean = isBoolean;
    this.isTimestamp = isTimestamp;
    this.isNull = isNull;
    this.numericEquals = numericEquals;
    this.stringEquals = stringEquals;
    this.timestampEquals = timestampEquals;
    this.booleanEquals = booleanEquals;
    this.numericEqualsPath = numericEqualsPath;
    this.stringEqualsPath = stringEqualsPath;
    this.timestampEqualsPath = timestampEqualsPath;
    this.booleanEqualsPath = booleanEqualsPath;
    this.numericLessThan = numericLessThan;
    this.stringLessThan = stringLessThan;
    this.timestampLessThan = timestampLessThan;
    this.numericLessThanPath = numericLessThanPath;
    this.stringLessThanPath = stringLessThanPath;
    this.timestampLessThanPath = timestampLessThanPath;
    this.numericGreaterThan = numericGreaterThan;
    this.stringGreaterThan = stringGreaterThan;
    this.timestampGreaterThan = timestampGreaterThan;
    this.numericGreaterThanPath = numericGreaterThanPath;
    this.stringGreaterThanPath = stringGreaterThanPath;
    this.timestampGreaterThanPath = timestampGreaterThanPath;
    this.numericGreaterThanEquals = numericGreaterThanEquals;
    this.stringGreaterThanEquals = stringGreaterThanEquals;
    this.timestampGreaterThanEquals = timestampGreaterThanEquals;
    this.numericGreaterThanEqualsPath = numericGreaterThanEqualsPath;
    this.stringGreaterThanEqualsPath = stringGreaterThanEqualsPath;
    this.timestampGreaterThanEqualsPath = timestampGreaterThanEqualsPath;
    this.numericLessThanEquals = numericLessThanEquals;
    this.stringLessThanEquals = stringLessThanEquals;
    this.timestampLessThanEquals = timestampLessThanEquals;
    this.numericLessThanEqualsPath = numericLessThanEqualsPath;
    this.stringLessThanEqualsPath = stringLessThanEqualsPath;
    this.timestampLessThanEqualsPath = timestampLessThanEqualsPath;
    this.stringMatches = stringMatches;
    this.and = and;
    this.or = or;
    this.not = not;
  }

  static toAsl(condition) {
    return objUtils.omit({
      IsPresent: condition.isPresent,
      IsNumeric: condition.isNumeric,
      IsString: condition.isString,
      IsBoolean: condition.isBoolean,
      IsTimestamp: condition.isTimestamp,
      IsNull: condition.isNull,
      NumericEquals: condition.numericEquals,
      StringEquals: condition.stringEquals,
      TimestampEquals: condition.timestampEquals,
      BooleanEquals: condition.booleanEquals,
      NumericEqualsPath: condition.numericEqualsPath,
      StringEqualsPath: condition.stringEqualsPath,
      TimestampEqualsPath: condition.timestampEqualsPath,
      BooleanEqualsPath: condition.booleanEqualsPath,
      NumericLessThan: condition.numericLessThan,
      StringLessThan: condition.stringLessThan,
      TimestampLessThan: condition.timestampLessThan,
      NumericLessThanPath: condition.numericLessThanPath,
      StringLessThanPath: condition.stringLessThanPath,
      TimestampLessThanPath: condition.timestampLessThanPath,
      NumericGreaterThan: condition.numericGreaterThan,
      StringGreaterThan: condition.stringGreaterThan,
      TimestampGreaterThan: condition.timestampGreaterThan,
      NumericGreaterThanPath: condition.numericGreaterThanPath,
      StringGreaterThanPath: condition.stringGreaterThanPath,
      TimestampGreaterThanPath: condition.timestampGreaterThanPath,
      NumericGreaterThanEquals: condition.numericGreaterThanEquals,
      StringGreaterThanEquals: condition.stringGreaterThanEquals,
      TimestampGreaterThanEquals: condition.timestampGreaterThanEquals,
      NumericGreaterThanEqualsPath: condition.numericGreaterThanEqualsPath,
      StringGreaterThanEqualsPath: condition.stringGreaterThanEqualsPath,
      TimestampGreaterThanEqualsPath: condition.timestampGreaterThanEqualsPath,
      NumericLessThanEquals: condition.numericLessThanEquals,
      StringLessThanEquals: condition.stringLessThanEquals,
      TimestampLessThanEquals: condition.timestampLessThanEquals,
      NumericLessThanEqualsPath: condition.numericLessThanEqualsPath,
      StringLessThanEqualsPath: condition.stringLessThanEqualsPath,
      TimestampLessThanEqualsPath: condition.timestampLessThanEqualsPath,
      StringMatches: condition.stringMatches,
      Or: condition.or?.map(ChoiceItemCondition.toAsl),
      And: condition.and?.map(ChoiceItemCondition.toAsl),
      Not: condition.not ? ChoiceItemCondition.toAsl(condition.not) : condition.not,
      Variable: condition.variable,
    });
  }

  static createFromAsl(asl) {
    if (!asl) return;
    return new ChoiceItemCondition({
      variable: asl.Variable,
      isPresent: asl.IsPresent,
      isNumeric: asl.IsNumeric,
      isString: asl.IsString,
      isBoolean: asl.IsBoolean,
      isTimestamp: asl.IsTimestamp,
      isNull: asl.IsNull,
      numericEquals: asl.NumericEquals,
      stringEquals: asl.StringEquals,
      timestampEquals: asl.TimestampEquals,
      booleanEquals: asl.BooleanEquals,
      numericEqualsPath: asl.NumericEqualsPath,
      stringEqualsPath: asl.StringEqualsPath,
      timestampEqualsPath: asl.TimestampEqualsPath,
      booleanEqualsPath: asl.BooleanEqualsPath,
      numericLessThan: asl.NumericLessThan,
      stringLessThan: asl.StringLessThan,
      timestampLessThan: asl.TimestampLessThan,
      numericLessThanPath: asl.NumericLessThanPath,
      stringLessThanPath: asl.StringLessThanPath,
      timestampLessThanPath: asl.TimestampLessThanPath,
      numericGreaterThan: asl.NumericGreaterThan,
      stringGreaterThan: asl.StringGreaterThan,
      timestampGreaterThan: asl.TimestampGreaterThan,
      numericGreaterThanPath: asl.NumericGreaterThanPath,
      stringGreaterThanPath: asl.StringGreaterThanPath,
      timestampGreaterThanPath: asl.TimestampGreaterThanPath,
      numericGreaterThanEquals: asl.NumericGreaterThanEquals,
      stringGreaterThanEquals: asl.StringGreaterThanEquals,
      timestampGreaterThanEquals: asl.TimestampGreaterThanEquals,
      numericGreaterThanEqualsPath: asl.NumericGreaterThanEqualsPath,
      stringGreaterThanEqualsPath: asl.StringGreaterThanEqualsPath,
      timestampGreaterThanEqualsPath: asl.TimestampGreaterThanEqualsPath,
      numericLessThanEquals: asl.NumericLessThanEquals,
      stringLessThanEquals: asl.StringLessThanEquals,
      timestampLessThanEquals: asl.TimestampLessThanEquals,
      numericLessThanEqualsPath: asl.NumericLessThanEqualsPath,
      stringLessThanEqualsPath: asl.StringLessThanEqualsPath,
      timestampLessThanEqualsPath: asl.TimestampLessThanEqualsPath,
      stringMatches: asl.StringMatches,
      or: asl.Or?.map(ChoiceItemCondition.createFromAsl),
      and: asl.And?.map(ChoiceItemCondition.createFromAsl),
      not: ChoiceItemCondition.createFromAsl(asl.Not),
    });
  }

  static toFormData(stateDefinition) {
    const isNewCondition = Object.values(stateDefinition).every(value => !value);
    if (isNewCondition) {
      return new ChoiceItemFormData({
        conditionalStatement: ConditionConstant.ConditionalStatement.SIMPLE.value,
        expressions: [new ChoiceItemExpression()],
      });
    }

    let conditionalStatement;

    /**
     * @type {ChoiceItemCondition[]}
     */
    let expressions = [];

    if (stateDefinition.and) {
      conditionalStatement = ConditionConstant.ConditionalStatement.AND.value;
      expressions = stateDefinition.and;
    } else if (stateDefinition.or) {
      conditionalStatement = ConditionConstant.ConditionalStatement.OR.value;
      expressions = stateDefinition.or;
    } else {
      conditionalStatement = ConditionConstant.ConditionalStatement.SIMPLE.value;
      expressions = [stateDefinition];
    }

    const parsedExpressions = expressions.map((expression) => {
      /**
       * @type {ChoiceItemExpression}
       */
      const newExpression = {};
      if (expression.not) {
        expression = expression.not;
        newExpression.not = ConditionConstant.NotCondition.NOT.value;
      }

      newExpression.variable = expression.variable;
      switch (true) {
        case expression.isPresent !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_PRESENT.value;
          newExpression.value = expression.isPresent;
          break;
        case expression.isNumeric !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_OF_TYPE.value;
          newExpression.valueType = ConditionConstant.BasicType.NUMBER.value;
          newExpression.value = expression.isNumeric;
          break;
        case expression.isTimestamp !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_OF_TYPE.value;
          newExpression.valueType = ConditionConstant.BasicType.TIMESTAMP.value;
          newExpression.value = expression.isTimestamp;
          break;
        case expression.isString !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_OF_TYPE.value;
          newExpression.valueType = ConditionConstant.BasicType.STRING.value;
          newExpression.value = expression.isString;
          break;
        case expression.isBoolean !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_OF_TYPE.value;
          newExpression.valueType = ConditionConstant.BasicType.BOOLEAN.value;
          newExpression.value = expression.isBoolean;
          break;
        case expression.isNull !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_OF_TYPE.value;
          newExpression.valueType = ConditionConstant.BasicType.NULL.value;
          newExpression.value = expression.isNull;
          break;
        case expression.numericEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_CONSTANT.value;
          newExpression.value = expression.numericEquals;
          break;
        case expression.timestampEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value;
          newExpression.value = expression.timestampEquals;
          break;
        case expression.stringEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_CONSTANT.value;
          newExpression.value = expression.stringEquals;
          break;
        case expression.booleanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.BOOLEAN_CONSTANT.value;
          newExpression.value = expression.booleanEquals;
          break;
        case expression.numericEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_VARIABLE.value;
          newExpression.value = expression.numericEqualsPath;
          break;
        case expression.timestampEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value;
          newExpression.value = expression.timestampEqualsPath;
          break;
        case expression.stringEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_VARIABLE.value;
          newExpression.value = expression.stringEqualsPath;
          break;
        case expression.booleanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.BOOLEAN_VARIABLE.value;
          newExpression.value = expression.booleanEqualsPath;
          break;
        case expression.numericLessThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_CONSTANT.value;
          newExpression.value = expression.numericLessThan;
          break;
        case expression.timestampLessThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value;
          newExpression.value = expression.timestampLessThan;
          break;
        case expression.stringLessThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_CONSTANT.value;
          newExpression.value = expression.stringLessThan;
          break;
        case expression.numericLessThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_VARIABLE.value;
          newExpression.value = expression.numericLessThanPath;
          break;
        case expression.timestampLessThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value;
          newExpression.value = expression.timestampLessThanPath;
          break;
        case expression.stringLessThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_VARIABLE.value;
          newExpression.value = expression.stringLessThanPath;
          break;
        case expression.numericGreaterThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_CONSTANT.value;
          newExpression.value = expression.numericGreaterThan;
          break;
        case expression.timestampGreaterThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value;
          newExpression.value = expression.timestampGreaterThan;
          break;
        case expression.stringGreaterThan !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_CONSTANT.value;
          newExpression.value = expression.stringGreaterThan;
          break;
        case expression.numericGreaterThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_VARIABLE.value;
          newExpression.value = expression.numericGreaterThanPath;
          break;
        case expression.timestampGreaterThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value;
          newExpression.value = expression.timestampGreaterThanPath;
          break;
        case expression.stringGreaterThanPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_VARIABLE.value;
          newExpression.value = expression.stringGreaterThanPath;
          break;
        case expression.numericLessThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_CONSTANT.value;
          newExpression.value = expression.numericLessThanEquals;
          break;
        case expression.timestampLessThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value;
          newExpression.value = expression.timestampLessThanEquals;
          break;
        case expression.stringLessThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_CONSTANT.value;
          newExpression.value = expression.stringLessThanEquals;
          break;
        case expression.numericLessThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_VARIABLE.value;
          newExpression.value = expression.numericLessThanEqualsPath;
          break;
        case expression.timestampLessThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value;
          newExpression.value = expression.timestampLessThanEqualsPath;
          break;
        case expression.stringLessThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_VARIABLE.value;
          newExpression.value = expression.stringLessThanEqualsPath;
          break;
        case expression.numericGreaterThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_CONSTANT.value;
          newExpression.value = expression.numericGreaterThanEquals;
          break;
        case expression.timestampGreaterThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value;
          newExpression.value = expression.timestampGreaterThanEquals;
          break;
        case expression.stringGreaterThanEquals !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_CONSTANT.value;
          newExpression.value = expression.stringGreaterThanEquals;
          break;
        case expression.numericGreaterThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.NUMBER_VARIABLE.value;
          newExpression.value = expression.numericGreaterThanEqualsPath;
          break;
        case expression.timestampGreaterThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value;
          newExpression.value = expression.timestampGreaterThanEqualsPath;
          break;
        case expression.stringGreaterThanEqualsPath !== undefined:
          newExpression.operator = ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value;
          newExpression.valueType = ConditionConstant.DetailedType.STRING_VARIABLE.value;
          newExpression.value = expression.stringGreaterThanEqualsPath;
          break;
        case expression.stringMatches !== undefined:
          newExpression.operator = ConditionConstant.Operator.MATCHES_STRING.value;
          newExpression.value = expression.stringMatches;
          break;
        default:
          break;
      }
      return newExpression;
    });

    return {
      conditionalStatement,
      expressions: parsedExpressions,
    };
  }

  static fromFormData({ conditionalStatement, expressions }) {
    const formDataDefinitions = expressions.map((expression) => {
      let definition = {};

      switch (expression.operator) {
        case ConditionConstant.Operator.IS_PRESENT.value:
          definition = {
            ...definition,
            isPresent: expression.value,
          };
          break;
        case ConditionConstant.Operator.IS_OF_TYPE.value:
          if (expression.valueType === ConditionConstant.BasicType.NUMBER.value) {
            definition = {
              ...definition,
              isNumeric: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.BasicType.TIMESTAMP.value) {
            definition = {
              ...definition,
              isTimestamp: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.BasicType.STRING.value) {
            definition = {
              ...definition,
              isString: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.BasicType.BOOLEAN.value) {
            definition = {
              ...definition,
              isBoolean: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.BasicType.NULL.value) {
            definition = {
              ...definition,
              isNull: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.IS_EQUAL_TO.value:
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value) {
            definition = {
              ...definition,
              numericEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value) {
            definition = {
              ...definition,
              timestampEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value) {
            definition = {
              ...definition,
              stringEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.BOOLEAN_CONSTANT.value) {
            definition = {
              ...definition,
              booleanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_VARIABLE.value) {
            definition = {
              ...definition,
              numericEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value) {
            definition = {
              ...definition,
              timestampEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_VARIABLE.value) {
            definition = {
              ...definition,
              stringEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.BOOLEAN_VARIABLE.value) {
            definition = {
              ...definition,
              booleanEqualsPath: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.IS_LESS_THAN.value:
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value) {
            definition = {
              ...definition,
              numericLessThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value) {
            definition = {
              ...definition,
              timestampLessThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value) {
            definition = {
              ...definition,
              stringLessThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_VARIABLE.value) {
            definition = {
              ...definition,
              numericLessThanPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value) {
            definition = {
              ...definition,
              timestampLessThanPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_VARIABLE.value) {
            definition = {
              ...definition,
              stringLessThanPath: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.IS_GREATER_THAN.value:
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value) {
            definition = {
              ...definition,
              numericGreaterThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value) {
            definition = {
              ...definition,
              timestampGreaterThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value) {
            definition = {
              ...definition,
              stringGreaterThan: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_VARIABLE.value) {
            definition = {
              ...definition,
              numericGreaterThanPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value) {
            definition = {
              ...definition,
              timestampGreaterThanPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_VARIABLE.value) {
            definition = {
              ...definition,
              stringGreaterThanPath: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.IS_LESS_THAN_OR_EQUAL_TO.value:
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value) {
            definition = {
              ...definition,
              numericLessThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value) {
            definition = {
              ...definition,
              timestampLessThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value) {
            definition = {
              ...definition,
              stringLessThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_VARIABLE.value) {
            definition = {
              ...definition,
              numericLessThanEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value) {
            definition = {
              ...definition,
              timestampLessThanEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_VARIABLE.value) {
            definition = {
              ...definition,
              stringLessThanEqualsPath: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.IS_GREATER_THAN_OR_EQUAL_TO.value:
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_CONSTANT.value) {
            definition = {
              ...definition,
              numericGreaterThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_CONSTANT.value) {
            definition = {
              ...definition,
              timestampGreaterThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_CONSTANT.value) {
            definition = {
              ...definition,
              stringGreaterThanEquals: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.NUMBER_VARIABLE.value) {
            definition = {
              ...definition,
              numericGreaterThanEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.TIMESTAMP_VARIABLE.value) {
            definition = {
              ...definition,
              timestampGreaterThanEqualsPath: expression.value,
            };
          }
          if (expression.valueType === ConditionConstant.DetailedType.STRING_VARIABLE.value) {
            definition = {
              ...definition,
              stringGreaterThanEqualsPath: expression.value,
            };
          }
          break;
        case ConditionConstant.Operator.MATCHES_STRING.value:
          definition = {
            ...definition,
            stringMatches: expression.value,
          };
          break;
        default:
          break;
      }

      definition = {
        ...definition,
        variable: expression.variable,
      };

      if (expression.not === ConditionConstant.NotCondition.NOT.value) {
        definition = { not: definition };
      }

      return definition;
    });

    let stateDefinition = {};

    if (conditionalStatement === ConditionConstant.ConditionalStatement.AND.value) {
      stateDefinition = { and: formDataDefinitions };
    } else if (conditionalStatement === ConditionConstant.ConditionalStatement.OR.value) {
      stateDefinition = { or: formDataDefinitions };
    } else if (conditionalStatement === ConditionConstant.ConditionalStatement.SIMPLE.value) {
      stateDefinition = { ...formDataDefinitions[0] };
    }

    return stateDefinition;
  }
}

export default ChoiceItemCondition;
