import { isEmpty } from '@kklab/fortress-validator-utils';
import arnUtils from '~/utils/arnUtils';

const lambdaArn = () => (v) => {
  if (isEmpty(v)) return false;
  return arnUtils.isLambdaArn(v);
};

export default lambdaArn;
