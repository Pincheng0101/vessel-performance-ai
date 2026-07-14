import { isEmpty } from '@kklab/fortress-validator-utils';

const stringContainsAnyLowercase = () => (v) => {
  if (isEmpty(v)) return false;
  return /[a-z]/.test(v);
};

export default stringContainsAnyLowercase;
