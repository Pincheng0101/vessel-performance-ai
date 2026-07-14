class arnUtils {
  /**
   * Extracts the workflow ID from an AWS Step Functions execution ARN.
   *
   * @param {string} arn - The ARN of the Step Functions execution.
   * @returns {string|null} The extracted workflow ID if found, otherwise null.
   */
  static getWorkflowId(arn) {
    if (!arn) return null;
    const match = arn.match(/execution:([^:]+):/);
    return match ? match[1] : null;
  }

  /**
   * Converts an AWS ARN (Amazon Resource Name) to a corresponding AWS Console URL.
   *
   * @param {string} value - The ARN string to be converted.
   * @returns {string} The AWS Console URL corresponding to the provided ARN, or an empty string if the input is falsy.
   */
  static toUrl = (value) => {
    if (!value) return '';
    const match = value.match(/^arn:aws[a-zA-Z-]*:([^:]+):([^:]+):\d{12}:(.+)$/);
    if (!match) return '';

    const [, service, region, resource] = match;
    if (service === 'states') {
      const paths = {
        stateMachine: `statemachines/view/${value}`,
        execution: `v2/executions/details/${value}`,
      };
      const pathType = Object.keys(paths).find(type => resource.startsWith(`${type}:`));
      return pathType ? `https://${region}.console.aws.amazon.com/states/home?region=${region}#/${paths[pathType]}` : '';
    }

    if (service === 'lambda') {
      const lambdaMatch = resource.match(/^function:([^:]+)(?::([^:]+))?$/);
      if (!lambdaMatch) return '';

      const [, functionName, qualifier] = lambdaMatch;
      const functionUrl = `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}`;
      if (!qualifier) return functionUrl;

      const qualifierType = /^\d+$/.test(qualifier) || qualifier.startsWith('$LATEST') ? 'versions' : 'aliases';
      return `${functionUrl}/${qualifierType}/${qualifier}`;
    }

    return '';
  };

  /**
   * Checks if a string is a valid AWS ARN.
   *
   * @param {string} value - The string to validate.
   * @returns {boolean} True if the string is a valid ARN, otherwise false.
   */
  static isArn(value) {
    if (typeof value !== 'string') return false;
    return (
      /^arn:aws[a-zA-Z-]*:[a-z0-9-]+:[a-z0-9-]*:\d{12}:.+/.test(value) // Standard ARN
      || /^arn:aws[a-zA-Z-]*:states:::[a-zA-Z0-9]+:[a-zA-Z0-9]+$/.test(value) // Service integration ARN
    );
  }

  /**
   * Checks if a string is a valid AWS Lambda function ARN.
   *
   * @param {string} value - The string to validate.
   * @returns {boolean} True if the string is a valid Lambda function ARN, otherwise false.
   */
  static isLambdaArn(value) {
    if (typeof value !== 'string') return false;
    return /^(?=.{1,256}$)arn:aws[a-zA-Z-]*:lambda:[a-z]{2}(?:-gov|-iso[a-z]?)?-[a-z]+-\d:\d{12}:function:[A-Za-z0-9-_.]+(?::(?:\$LATEST(?:\.PUBLISHED)?|[A-Za-z0-9-_]+))?$/.test(value);
  }
}

export default arnUtils;
