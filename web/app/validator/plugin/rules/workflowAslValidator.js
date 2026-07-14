import { isEmpty } from '@kklab/fortress-validator-utils';
import { workflowAslValidations } from '~/codemirror/linters/workflowAslLinter';

const workflowAslValidator = (type = '') => (value) => {
  if (isEmpty(value)) return false;
  const issues = workflowAslValidations(value, type);
  return issues.length === 0;
};

export default workflowAslValidator;
