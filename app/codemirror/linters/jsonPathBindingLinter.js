import { LinterConstant } from '~/codemirror/constants';

export default () => {
  return (view) => {
    const text = view.state.doc.toString();
    if (strUtils.isNumeric(text)) return [];
    if (!jsonUtils.isValid(text)) return [];
    const json = jsonUtils.safeParse(text);
    if (!objUtils.isEmpty(json)) {
      const issues = [];
      const ast = jsonAstUtils.buildAst(text);
      const invalidJsonPathBindings = referencePathUtils.findInvalidJsonPathBindings(json);
      invalidJsonPathBindings.forEach(({ type, key, path }) => {
        const result = path?.length > 0
          ? jsonAstUtils.findLocationByPath(ast, path, { locateKey: type === 'key', locateValue: type === 'value' })
          : null;

        const propNode = result ? { loc: result.loc, value: result.node } : jsonAstUtils.findPropertyNodeByKey(ast, key);
        if (!propNode?.loc) return;
        const isString = propNode.value?.type === 'String';
        const isKeyError = type === 'key';
        issues.push({
          from: propNode.loc.start + (isKeyError || isString ? 1 : 0),
          to: propNode.loc.end - (isKeyError || isString ? 1 : 0),
          severity: LinterConstant.SeverityType.ERROR,
          message: isKeyError
            ? `The key "${key}" must end with ".$" when its associated value is an AWS Step Functions JSONPath expression.`
            : `The value of "${key}" must be a valid AWS Step Functions JSONPath expression.`,
        });
      });
      return issues;
    };
    return [];
  };
};
