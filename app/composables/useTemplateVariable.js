import { RegexConstant } from '~/constants';

export const useTemplateVariable = () => {
  const extractJinjaTemplateVariables = (template) => {
    if (typeof template !== 'string' || !template.trim()) return [];
    const variableRegex = RegexConstant.Jinja.VARIABLE_REGEX;
    const variables = new Set();
    let match;
    while ((match = variableRegex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    return Array.from(variables);
  };

  const extractSqlTemplateParameters = (template) => {
    if (typeof template !== 'string' || !template.trim()) return [];
    const parameterRegex = RegexConstant.Sql.PARAMETER_REGEX;
    const parameters = new Set();
    let match;
    while ((match = parameterRegex.exec(template)) !== null) {
      parameters.add(match[1]);
    }
    return Array.from(parameters);
  };

  return {
    extractJinjaTemplateVariables,
    extractSqlTemplateParameters,
  };
};
