import { ConditionConstant } from '~/constants';
import { ChoiceItemCondition } from '~/models/workflow/state/choice';

export function useChoiceFlow() {
  const getConditionExpression = (condition) => {
    if (!condition) return '';
    const formData = ChoiceItemCondition.toFormData(condition);
    const filteredExpressions = formData.conditionalStatement === ConditionConstant.ConditionalStatement.SIMPLE.value ? [formData.expressions[0]] : formData.expressions;
    const expressions = filteredExpressions.map((exp) => {
      if (!exp.operator) return;
      const expressionClause = ConditionConstant.OperatorMap[exp.operator](exp);
      return exp.not ? `not(${exp.variable} ${expressionClause})` : `${exp.variable} ${expressionClause}`;
    });
    const separator = formData.conditionalStatement === ConditionConstant.ConditionalStatement.OR.value ? ' or ' : ' and ';
    return expressions.join(separator);
  };

  const getChoiceItemDisplayText = (choiceItem) => {
    if (choiceItem.stateDefinition.comment) {
      return choiceItem.stateDefinition.comment;
    }
    if (choiceItem.stateDefinition.condition) {
      return getConditionExpression(choiceItem.stateDefinition.condition);
    }
  };

  return {
    getConditionExpression,
    getChoiceItemDisplayText,
  };
};
